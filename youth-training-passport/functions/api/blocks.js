/**
 * /api/blocks — 4–6 週 block（教練）
 * GET ?owner_type=group|athlete&owner_id=   該 owner 的 blocks（含動作格狀）
 * GET ?templates=1                           內建範本 blocks + RAMP 模板
 * GET ?id=                                   單一 block
 * POST { ...欄位, copy_from?: blockId, exercises?: [] }   建立（copy_from 會複製動作格狀）
 * PUT  ?id=  { ...欄位, exercises: [] }      更新（exercises 全量取代）
 * DELETE ?id=                                刪除（sessions.block_id 改為 NULL）
 */
import { AXES, CATEGORIES, SEGMENTS, catalogUpsert, splitDose, json } from '../_shared/model.js';
import { requireAuth } from '../_shared/verify.js';
import { shapeBlock } from '../_shared/stats.js';
import { SEG_ORDER } from '../_shared/sessions.js';

async function withExercises(env, rows) {
  if (!rows.length) return [];
  const ph = rows.map(() => '?').join(',');
  const ex = (await env.DB.prepare(`SELECT * FROM block_exercises WHERE block_id IN (${ph}) ORDER BY block_id, ${SEG_ORDER}, sort_order`).bind(...rows.map(b => b.id)).all()).results;
  const by = {}; for (const e of ex) (by[e.block_id] ||= []).push(e);
  return rows.map(b => shapeBlock(b, by[b.id] || []));
}

function fields(b) {
  const arr = v => JSON.stringify(Array.isArray(v) ? v : []);
  return {
    title: String(b.title || '').trim() || '未命名 block',
    goal_text: String(b.goal_text || ''),
    main_axis: AXES.includes(b.main_axis) ? b.main_axis : 'strength',
    intensity: ['low', 'mid', 'high'].includes(b.intensity) ? b.intensity : 'low',
    weeks: Math.min(Math.max(parseInt(b.weeks, 10) || 6, 1), 12),
    start_date: b.start_date || null,
    end_date: b.end_date || null,
    ramp_template_id: b.ramp_template_id ? parseInt(b.ramp_template_id, 10) : null,
    raise_types: arr(b.raise_types), pot_types: arr(b.pot_types),
    act_types: arr(b.act_types), mob_types: arr(b.mob_types),
    am_types: JSON.stringify([...(Array.isArray(b.act_types) ? b.act_types : []), ...(Array.isArray(b.mob_types) ? b.mob_types : [])]),
    season_id: b.season_id ? parseInt(b.season_id, 10) : null,
    sort_order: parseInt(b.sort_order, 10) || 0,
    goal_kind: b.goal_kind === 'competition' ? 'competition' : 'general',
    phase: String(b.phase || '').slice(0, 20),
    emphasis: JSON.stringify(cleanEmphasis(b.emphasis) || {}),
    goal_template_id: b.goal_template_id ? parseInt(b.goal_template_id, 10) : null,
  };
}

function cleanEmphasis(v) {
  const src = typeof v === 'string' ? JSON.parse(v || '{}') : (v || {});
  const out = {};
  let sum = 0;
  for (const c of CATEGORIES) { const n = Math.max(0, Math.min(100, Math.round(Number(src[c]) || 0))); out[c] = n; sum += n; }
  return sum > 0 ? out : null;
}

async function replaceExercises(env, blockId, exercises) {
  await env.DB.prepare('DELETE FROM block_exercises WHERE block_id=?').bind(blockId).run();
  const stmts = [];
  const seen = new Set();
  (exercises || []).forEach((e, i) => {
    const name = String(e.name || '').trim();
    if (!name) return;
    const seg = SEGMENTS.includes(e.segment) ? e.segment : 'main';
    const cat = CATEGORIES.includes(e.category) ? e.category : 'strength';
    const doses = Array.isArray(e.doses) ? e.doses.map(d => String(d ?? '')) : [];
    stmts.push(env.DB.prepare(
      'INSERT INTO block_exercises (block_id, segment, name, target_movement, category, doses, sort_order) VALUES (?,?,?,?,?,?,?)'
    ).bind(blockId, seg, name, String(e.target_movement || ''), cat, JSON.stringify(doses), i + 1));
    // 課表裡打的新動作也記進動作庫，下次排課就選得到
    const key = cat + '|' + name;
    if (!seen.has(key)) {
      seen.add(key);
      const { sets, reps } = splitDose(doses.find(d => d && d !== '✓') || '');
      stmts.push(catalogUpsert(env, { category: cat, name, segment: seg, sets, reps }));
    }
  });
  if (stmts.length) await env.DB.batch(stmts);
}

export async function onRequest({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: 'Unauthorized' }, 401);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  try {
    if (request.method === 'GET') {
      if (url.searchParams.get('templates')) {
        const rows = (await env.DB.prepare(`SELECT * FROM blocks WHERE owner_type='template' ORDER BY sort_order, id`).all()).results;
        const ramp = (await env.DB.prepare('SELECT * FROM ramp_templates ORDER BY id').all()).results
          .map(t => ({ id: t.id, name: t.name, raise_min: t.raise_min, act_min: t.act_min, mob_min: t.mob_min, pot_min: t.pot_min, focus: JSON.parse(t.focus) }));
        return json({ blocks: await withExercises(env, rows), ramp_templates: ramp });
      }
      if (id) {
        const b = await env.DB.prepare('SELECT * FROM blocks WHERE id=?').bind(id).first();
        if (!b) return json({ error: 'Not found' }, 404);
        return json({ block: (await withExercises(env, [b]))[0] });
      }
      // 孤兒課表：歸屬的組別或學員已經被刪掉，沒有任何人看得到它
      if (url.searchParams.get('orphans')) {
        const rows = (await env.DB.prepare(
          `SELECT * FROM blocks WHERE
             (owner_type='group'   AND owner_id NOT IN (SELECT id FROM groups))
          OR (owner_type='athlete' AND owner_id NOT IN (SELECT id FROM athletes))
           ORDER BY start_date, id`
        ).all()).results;
        return json({ blocks: await withExercises(env, rows) });
      }
      const ot = url.searchParams.get('owner_type'), oid = url.searchParams.get('owner_id');
      const rows = (await env.DB.prepare('SELECT * FROM blocks WHERE owner_type=? AND owner_id=? ORDER BY start_date, sort_order, id').bind(ot, oid).all()).results;
      const seasons = (await env.DB.prepare('SELECT * FROM seasons WHERE owner_type=? AND owner_id=? ORDER BY start_date').bind(ot, oid).all()).results;
      return json({ blocks: await withExercises(env, rows), seasons });
    }

    if (request.method === 'POST') {
      const b = await request.json();
      const ot = ['group', 'athlete', 'template'].includes(b.owner_type) ? b.owner_type : null;
      if (!ot) return json({ error: 'owner_type 無效' }, 400);
      const f = fields(b);
      const r = await env.DB.prepare(
        `INSERT INTO blocks (owner_type, owner_id, season_id, title, goal_text, main_axis, intensity, weeks, start_date, end_date, ramp_template_id, raise_types, am_types, act_types, mob_types, pot_types, sort_order, goal_kind, phase, emphasis, goal_template_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(ot, parseInt(b.owner_id, 10) || 0, f.season_id, f.title, f.goal_text, f.main_axis, f.intensity, f.weeks, f.start_date, f.end_date, f.ramp_template_id, f.raise_types, f.am_types, f.act_types, f.mob_types, f.pot_types, f.sort_order, f.goal_kind, f.phase, f.emphasis, f.goal_template_id).run();
      const newId = r.meta.last_row_id;
      if (b.copy_from) {
        await env.DB.prepare(
          'INSERT INTO block_exercises (block_id, segment, name, target_movement, category, doses, sort_order) SELECT ?, segment, name, target_movement, category, doses, sort_order FROM block_exercises WHERE block_id=?'
        ).bind(newId, parseInt(b.copy_from, 10)).run();
      } else if (Array.isArray(b.exercises)) {
        await replaceExercises(env, newId, b.exercises);
      }
      return json({ ok: true, id: newId });
    }

    if (request.method === 'PUT') {
      const b = await request.json();
      // 只改歸屬（把孤兒課表接回某個組別或學員）
      if (b.reassign_to) {
        const ot = ['group', 'athlete'].includes(b.reassign_to.owner_type) ? b.reassign_to.owner_type : null;
        if (!ot) return json({ error: 'owner_type 無效' }, 400);
        await env.DB.prepare('UPDATE blocks SET owner_type=?, owner_id=? WHERE id=?')
          .bind(ot, parseInt(b.reassign_to.owner_id, 10) || 0, id).run();
        return json({ ok: true });
      }
      const f = fields(b);
      await env.DB.prepare(
        `UPDATE blocks SET season_id=?, title=?, goal_text=?, main_axis=?, intensity=?, weeks=?, start_date=?, end_date=?, ramp_template_id=?, raise_types=?, am_types=?, act_types=?, mob_types=?, pot_types=?, sort_order=?, goal_kind=?, phase=?, emphasis=?, goal_template_id=? WHERE id=?`
      ).bind(f.season_id, f.title, f.goal_text, f.main_axis, f.intensity, f.weeks, f.start_date, f.end_date, f.ramp_template_id, f.raise_types, f.am_types, f.act_types, f.mob_types, f.pot_types, f.sort_order, f.goal_kind, f.phase, f.emphasis, f.goal_template_id, id).run();
      if (Array.isArray(b.exercises)) await replaceExercises(env, id, b.exercises);
      return json({ ok: true });
    }

    if (request.method === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('UPDATE sessions SET block_id=NULL WHERE block_id=?').bind(id),
        env.DB.prepare('DELETE FROM block_exercises WHERE block_id=?').bind(id),
        env.DB.prepare('DELETE FROM blocks WHERE id=?').bind(id),
      ]);
      return json({ ok: true });
    }
    return new Response('Method Not Allowed', { status: 405 });
  } catch (err) {
    console.error('blocks error:', err);
    return json({ error: err.message }, 500);
  }
}
