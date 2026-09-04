/**
 * 寫入一堂課（app 表單與 Sheet 匯入共用）
 */
import { AXES, CATEGORIES, RAMP_TYPES, SEGMENTS, SEG_META, catalogUpsert, splitDose, parseJson } from './model.js';
import { pickBlock, weekOf } from './stats.js';

export async function blocksForAthlete(env, athlete) {
  return (await env.DB.prepare(
    `SELECT * FROM blocks WHERE (owner_type='athlete' AND owner_id=?) OR (owner_type='group' AND owner_id=?) ORDER BY start_date, sort_order`
  ).bind(athlete.id, athlete.group_id || -1).all()).results;
}

export const SEG_ORDER = `CASE segment WHEN 'raise' THEN 1 WHEN 'activation' THEN 2 WHEN 'mobilize' THEN 3 WHEN 'pot' THEN 4 ELSE 5 END`;

export async function planForWeek(env, block, week) {
  if (!block) return [];
  const rows = (await env.DB.prepare(`SELECT * FROM block_exercises WHERE block_id=? ORDER BY ${SEG_ORDER}, sort_order`).bind(block.id).all()).results;
  const out = [];
  for (const e of rows) {
    const doses = parseJson(e.doses, []);
    const d = String(doses[(week || 1) - 1] ?? '').trim();
    if (!d) continue; // 本週未進場
    const { sets, reps } = splitDose(d);
    out.push({
      name: e.name, sets, reps, load_kg: null, dose: d === '✓' ? '' : d,
      category: e.category, target_movement: e.target_movement,
      segment: SEGMENTS.includes(e.segment) ? e.segment : 'main', from_plan: 1,
    });
  }
  return out;
}

/** "3x8@12kg" → { dose:"3x8", load_kg:12 } */
export function splitLoad(doseStr) {
  const s = String(doseStr || '').trim();
  const m = s.match(/^(.*?)\s*@\s*([\d.]+)\s*(kg|公斤)?\s*$/i);
  if (m && m[2]) return { dose: m[1].trim(), load_kg: parseFloat(m[2]) };
  return { dose: s, load_kg: null };
}

function cleanTypes(phase, arr) {
  return (Array.isArray(arr) ? arr : []).filter(t => RAMP_TYPES[phase][t]);
}

/**
 * data: { session_date, block_id?, main_axis, duration_min, raise_min, am_min, pot_min, main_min?,
 *         raise_types, am_types, pot_types, session_rpe, coach_note, source, exercises: [] }
 */
export async function insertSession(env, athlete, data) {
  const blocks = await blocksForAthlete(env, athlete);
  let block = data.block_id ? blocks.find(b => b.id === Number(data.block_id)) : null;
  if (!block) block = pickBlock(blocks, data.session_date);
  const week = block ? weekOf(block, data.session_date) : null;

  const int = (v, d) => Math.max(0, parseInt(v ?? d, 10) || 0);
  const raise_min = int(data.raise_min, 5);
  const legacyAm = data.act_min == null && data.mob_min == null && data.am_min != null;
  const am = int(data.am_min, 8);
  const act_min = legacyAm ? Math.floor(am / 2) : int(data.act_min, 4);
  const mob_min = legacyAm ? am - Math.floor(am / 2) : int(data.mob_min, 4);
  const pot_min = int(data.pot_min, 5);
  const duration = Math.max(1, parseInt(data.duration_min, 10) || 50);
  const main_min = data.main_min != null && data.main_min !== ''
    ? Math.max(0, parseInt(data.main_min, 10) || 0)
    : Math.max(0, duration - raise_min - act_min - mob_min - pot_min);
  const main_axis = AXES.includes(data.main_axis) ? data.main_axis : (block?.main_axis || 'strength');
  const rt = cleanTypes('raise', data.raise_types ?? parseJson(block?.raise_types, []));
  // 舊格式（Sheet 匯入）只有 am_types，依型態歸屬拆回 activation / mobilize
  const amTypes = legacyAm && data.am_types ? (Array.isArray(data.am_types) ? data.am_types : parseJson(data.am_types, [])) : null;
  const at = cleanTypes('activation', data.act_types ?? amTypes ?? parseJson(block?.act_types, []));
  const mt = cleanTypes('mobilize', data.mob_types ?? amTypes ?? parseJson(block?.mob_types, []));
  const pt = cleanTypes('pot', data.pot_types ?? parseJson(block?.pot_types, []));
  const rpe = data.session_rpe ? Math.min(10, Math.max(1, parseInt(data.session_rpe, 10))) : null;

  // force_id：事後修改一堂課時沿用原本的 id，紀錄的身分不會跑掉
  const keepId = data.force_id ? parseInt(data.force_id, 10) : null;
  const cols = 'athlete_id, block_id, session_date, week_no, main_axis, duration_min, raise_min, am_min, act_min, mob_min, pot_min, main_min, raise_types, am_types, act_types, mob_types, pot_types, session_rpe, coach_note, source';
  const vals = [athlete.id, block?.id || null, data.session_date, week, main_axis, duration, raise_min, act_min + mob_min, act_min, mob_min, pot_min, main_min,
    JSON.stringify(rt), JSON.stringify([...at, ...mt]), JSON.stringify(at), JSON.stringify(mt), JSON.stringify(pt),
    rpe, String(data.coach_note || ''), data.source === 'sheet' ? 'sheet' : 'app'];
  const r = await env.DB.prepare(
    keepId
      ? `INSERT INTO sessions (id, ${cols}) VALUES (${Array(vals.length + 1).fill('?').join(',')})`
      : `INSERT INTO sessions (${cols}) VALUES (${Array(vals.length).fill('?').join(',')})`
  ).bind(...(keepId ? [keepId, ...vals] : vals)).run();
  const sid = keepId || r.meta.last_row_id;

  const exs = (Array.isArray(data.exercises) ? data.exercises : []).filter(e => String(e.name || '').trim());
  const stmts = [];
  exs.forEach((e, i) => {
    const name = String(e.name).trim();
    const seg = SEGMENTS.includes(e.segment) ? e.segment : 'main';
    // 有給 sets/reps 就用；沒有就從 dose 字串拆
    const parsed = splitLoad(e.dose);
    const fromDose = splitDose(parsed.dose);
    const sets = e.sets != null && e.sets !== '' ? Math.max(0, parseInt(e.sets, 10) || 0) || null : fromDose.sets;
    const reps = e.reps != null && e.reps !== '' ? String(e.reps).trim() : fromDose.reps;
    const load_kg = e.load_kg != null && e.load_kg !== '' ? parseFloat(e.load_kg) : parsed.load_kg;
    const dose = sets && reps ? `${sets}x${reps}` : (reps || parsed.dose || '');
    const cat = CATEGORIES.includes(e.category) ? e.category : (seg === 'main' ? main_axis : SEG_META[seg].cats[0]);
    stmts.push(env.DB.prepare(
      'INSERT INTO session_exercises (session_id, segment, name, dose, sets, reps, load_kg, category, target_movement, sort_order, from_plan) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).bind(sid, seg, name, dose, sets, reps, Number.isFinite(load_kg) ? load_kg : null, cat, String(e.target_movement || ''), i + 1, e.from_plan ? 1 : 0));
    stmts.push(catalogUpsert(env, { category: cat, name, segment: seg, sets, reps }));
  });
  if (stmts.length) await env.DB.batch(stmts);
  return { id: sid, block_id: block?.id || null, week_no: week, main_axis, main_min };
}
