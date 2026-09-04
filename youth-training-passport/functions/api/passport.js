/**
 * /api/passport?id=<public_id> — 學員護照資料包（公開）
 * 學員、階段目標、分類累積與佔比、塔事件序列、突破構件、Focus 等級、目前 block、紀錄、成長、同階段基準線
 */
import { CATEGORIES, RAMP_TYPES, SEG_META, CAT_LABEL, parseJson, json } from '../_shared/model.js';
import { loadTargets, buildStats, weekOf, shapeBlock, pickBlock, pctOf } from '../_shared/stats.js';
import { SEG_ORDER } from '../_shared/sessions.js';

export async function athleteBlocks(env, athlete) {
  const rows = (await env.DB.prepare(
    `SELECT * FROM blocks WHERE (owner_type='athlete' AND owner_id=?) OR (owner_type='group' AND owner_id=?) ORDER BY start_date, sort_order`
  ).bind(athlete.id, athlete.group_id || -1).all()).results;
  return rows;
}

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
  const url = new URL(request.url);
  const id = (url.searchParams.get('id') || '').trim();
  if (!id) return json({ error: 'id is required' }, 400);

  try {
    const athlete = await env.DB.prepare('SELECT * FROM athletes WHERE public_id = ? COLLATE NOCASE').bind(id).first();
    if (!athlete) return json({ error: 'Not found' }, 404);
    const group = athlete.group_id ? await env.DB.prepare('SELECT id, name FROM groups WHERE id=?').bind(athlete.group_id).first() : null;

    const [stageTargets, blocks, sessRows, tbRows, focusRows, growthRows] = await Promise.all([
      loadTargets(env),
      athleteBlocks(env, athlete),
      env.DB.prepare('SELECT * FROM sessions WHERE athlete_id=? ORDER BY session_date, id').bind(athlete.id).all().then(r => r.results),
      env.DB.prepare('SELECT * FROM turning_blocks WHERE athlete_id=? ORDER BY granted_on, id').bind(athlete.id).all().then(r => r.results),
      env.DB.prepare('SELECT * FROM focus_levels WHERE athlete_id=? ORDER BY achieved_on, id').bind(athlete.id).all().then(r => r.results),
      env.DB.prepare('SELECT * FROM growth_log WHERE athlete_id=? ORDER BY measured_on').bind(athlete.id).all().then(r => r.results),
    ]);

    // 動作要在算分類分鐘之前掛回 session（分鐘依板塊實排動作分配）
    const allEx = sessRows.length
      ? (await env.DB.prepare(`SELECT * FROM session_exercises WHERE session_id IN (SELECT id FROM sessions WHERE athlete_id=?) ORDER BY sort_order`).bind(athlete.id).all()).results
      : [];
    const exBySession = {};
    for (const e of allEx) (exBySession[e.session_id] ||= []).push(e);
    for (const s of sessRows) s.exercises = exBySession[s.id] || [];

    const stats = buildStats({ sessions: sessRows, blocks, turningBlocks: tbRows, stageTargets, athlete });

    // 目前 / 下一個 block
    const today = new Date().toISOString().slice(0, 10);
    const current = pickBlock(blocks, today);
    let next = null;
    for (const b of blocks) { if (b.start_date && b.start_date > today) { next = b; break; } }
    let currentBlock = null;
    if (current) {
      const ex = (await env.DB.prepare(`SELECT * FROM block_exercises WHERE block_id=? ORDER BY ${SEG_ORDER}, sort_order`).bind(current.id).all()).results;
      currentBlock = { ...shapeBlock(current, ex), week_now: weekOf(current, today) };
      // 中期目標進度：只算這段期間上的課，實際比重 vs 目標比重
      const inRange = sessRows.filter(s => s.session_date >= (current.start_date || '0000-00-00') && s.session_date <= (current.end_date || '9999-12-31'));
      const acc = Object.fromEntries(CATEGORIES.map(c => [c, 0]));
      for (const s of inRange) { const m = stats.per_session[s.id] || {}; for (const c of CATEGORIES) acc[c] += m[c] || 0; }
      const emph = currentBlock.emphasis && Object.values(currentBlock.emphasis).some(v => v > 0)
        ? currentBlock.emphasis
        : Object.fromEntries(CATEGORIES.map(c => [c, stats.targets[c]?.target || 0]));
      currentBlock.progress = {
        sessions: inRange.length,
        minutes: Math.round(CATEGORIES.reduce((a, c) => a + acc[c], 0)),
        pct: pctOf(acc),
        target: emph,
        using_stage_default: !(currentBlock.emphasis && Object.values(currentBlock.emphasis).some(v => v > 0)),
      };
    }
    const season = current?.season_id ? await env.DB.prepare('SELECT * FROM seasons WHERE id=?').bind(current.season_id).first() : null;

    // RAMP 模板（目前 block 的，否則第一個）
    const tplId = current?.ramp_template_id || 1;
    const tpl = await env.DB.prepare('SELECT * FROM ramp_templates WHERE id=?').bind(tplId).first()
      || await env.DB.prepare('SELECT * FROM ramp_templates ORDER BY id LIMIT 1').first();
    const focusDefs = tpl ? parseJson(tpl.focus, []) : [];
    const focusLevels = {};
    for (const r of focusRows) focusLevels[r.focus_key] = { level: r.level, achieved_on: r.achieved_on };

    // 動作示範影片：從動作庫用 (分類,名稱) 對回來，孩子點縮圖就能看怎麼做
    const vidRows = (await env.DB.prepare(
      `SELECT category, name, video_id, video_title, video_seconds FROM exercise_catalog WHERE video_id <> '' AND video_status IN ('ok','suggested')`
    ).all()).results;
    const vidBy = {};
    for (const v of vidRows) vidBy[`${v.category}${v.name.toLowerCase()}`] = { id: v.video_id, title: v.video_title, seconds: v.video_seconds };
    const vidFor = e => vidBy[`${e.category}${String(e.name).toLowerCase()}`] || null;

    // 紀錄（最近 30 筆，含動作與分類分鐘）
    const recent = [...sessRows].reverse().slice(0, 30);
    const blockTitle = Object.fromEntries(blocks.map(b => [b.id, b.title]));
    const sessions = recent.map(s => ({
      id: s.id, date: s.session_date, block_id: s.block_id, block_title: blockTitle[s.block_id] || '', week_no: s.week_no,
      main_axis: s.main_axis, duration_min: s.duration_min, main_min: s.main_min,
      raise_min: s.raise_min, act_min: s.act_min, mob_min: s.mob_min, pot_min: s.pot_min,
      raise_types: parseJson(s.raise_types, []), act_types: parseJson(s.act_types, []),
      mob_types: parseJson(s.mob_types, []), pot_types: parseJson(s.pot_types, []),
      session_rpe: s.session_rpe, coach_note: s.coach_note, source: s.source,
      category_minutes: Object.fromEntries(CATEGORIES.map(c => [c, Math.round((stats.per_session[s.id]?.[c] || 0) * 10) / 10])),
      exercises: (s.exercises || []).map(e => ({
        id: e.id, segment: e.segment || 'main', name: e.name, sets: e.sets, reps: e.reps, dose: e.dose,
        load_kg: e.load_kg, category: e.category, target_movement: e.target_movement, from_plan: e.from_plan,
        video: vidFor(e),
      })),
    }));

    // 同階段匿名基準：其他學員的平均佔比與平均構件數
    const peers = (await env.DB.prepare('SELECT id FROM athletes WHERE stage=? AND id<>?').bind(athlete.stage, athlete.id).all()).results;
    let baseline = null;
    if (peers.length) {
      const ph = peers.map(() => '?').join(',');
      const peerSess = (await env.DB.prepare(`SELECT * FROM sessions WHERE athlete_id IN (${ph})`).bind(...peers.map(p => p.id)).all()).results;
      if (peerSess.length) {
        const ph2 = peerSess.map(() => '?').join(',');
        const pex = (await env.DB.prepare(`SELECT * FROM session_exercises WHERE session_id IN (${ph2})`).bind(...peerSess.map(s => s.id)).all()).results;
        const pby = {};
        for (const e of pex) (pby[e.session_id] ||= []).push(e);
        for (const s of peerSess) s.exercises = pby[s.id] || [];
      }
      const byA = {};
      for (const s of peerSess) (byA[s.athlete_id] ||= []).push(s);
      const pctAcc = Object.fromEntries(CATEGORIES.map(c => [c, 0]));
      let n = 0, bricks = 0;
      for (const p of peers) {
        const st = buildStats({ sessions: byA[p.id] || [], blocks: [], turningBlocks: [], stageTargets, athlete: { ...athlete, id: p.id } });
        if (!(byA[p.id] || []).length) continue;
        n++; bricks += st.brick_total;
        for (const c of CATEGORIES) pctAcc[c] += st.pct_all[c];
      }
      if (n) baseline = { n, pct: Object.fromEntries(CATEGORIES.map(c => [c, Math.round(pctAcc[c] / n * 10) / 10])), brick_avg: Math.round(bricks / n * 10) / 10 };
    }

    const totalMin = CATEGORIES.reduce((a, c) => a + stats.totals_all[c], 0);
    return json({
      athlete: {
        public_id: athlete.public_id, nickname: athlete.nickname, avatar: athlete.avatar || '', avatar_initial: athlete.avatar_initial,
        sex: athlete.sex, birth_year: athlete.birth_year, stage: athlete.stage, stage_started_on: athlete.stage_started_on,
        group, notes: athlete.notes,
      },
      labels: CAT_LABEL,
      ramp_types: RAMP_TYPES,
      segments: SEG_META,
      targets: stats.targets,
      thresholds: stats.thresholds,
      totals_all: stats.totals_all,
      totals_stage: stats.totals_stage,
      pct_all: stats.pct_all,
      pct_stage: stats.pct_stage,
      bricks: stats.bricks,
      brick_total: stats.brick_total,
      tower_events: stats.tower_events,
      turning_blocks: tbRows,
      focus_defs: focusDefs,
      focus_levels: focusLevels,
      focus_history: focusRows,
      season: season ? { id: season.id, title: season.title, goal_text: season.goal_text, start_date: season.start_date, end_date: season.end_date } : null,
      current_block: currentBlock,
      next_block: next ? { id: next.id, title: next.title, start_date: next.start_date, main_axis: next.main_axis, phase: next.phase || '' } : null,
      blocks: blocks.map(b => ({ id: b.id, title: b.title, start_date: b.start_date, end_date: b.end_date, main_axis: b.main_axis, owner_type: b.owner_type })),
      sessions,
      session_count: sessRows.length,
      total_minutes: Math.round(totalMin),
      first_date: sessRows[0]?.session_date || null,
      growth: growthRows,
      baseline,
    });
  } catch (err) {
    console.error('passport GET error:', err);
    return json({ error: 'Failed to load passport: ' + err.message }, 500);
  }
}
