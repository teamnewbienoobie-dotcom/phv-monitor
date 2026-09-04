/**
 * 學員統計組裝：分類累積、佔比、構件、塔事件序列
 */
import { CATEGORIES, SEGMENTS, sessionCategoryMinutes, thresholdsFor, bricksFor, parseJson } from './model.js';

export async function loadTargets(env) {
  const rows = (await env.DB.prepare('SELECT * FROM stage_targets').all()).results;
  const byStage = {};
  for (const r of rows) (byStage[r.stage] ||= {})[r.category] = { target: r.target_pct, tol: r.tolerance_pct };
  return byStage;
}

export function pctOf(totals) {
  const sum = CATEGORIES.reduce((a, c) => a + (totals[c] || 0), 0);
  const out = {};
  for (const c of CATEGORIES) out[c] = sum ? Math.round((totals[c] || 0) / sum * 1000) / 10 : 0;
  return out;
}

function addTo(acc, m) { for (const c of CATEGORIES) acc[c] = (acc[c] || 0) + (m[c] || 0); }
function zero() { return Object.fromEntries(CATEGORIES.map(c => [c, 0])); }

/**
 * 輸入：sessions（升冪）、blocks（該學員/組別）、turning blocks、目標表
 * 輸出：totals_all / totals_stage / bricks / tower_events
 */
export function buildStats({ sessions, blocks, turningBlocks, stageTargets, athlete }) {
  const targets = stageTargets[athlete.stage] || stageTargets.pre || {};
  const targetPct = Object.fromEntries(CATEGORIES.map(c => [c, targets[c]?.target || 0]));
  const thresholds = thresholdsFor(targetPct);

  const totalsAll = zero();
  const totalsStage = zero();
  const stageStart = athlete.stage_started_on || '0000-00-00';
  const running = zero();
  const bricksEmitted = zero();
  const events = [];
  const blockById = Object.fromEntries(blocks.map(b => [b.id, b]));
  const blockSeen = new Set();

  const sorted = [...sessions].sort((a, b) => a.session_date.localeCompare(b.session_date) || a.id - b.id);
  const perSession = {};
  for (const s of sorted) {
    const m = sessionCategoryMinutes(s);
    perSession[s.id] = m;
    addTo(totalsAll, m);
    if (s.session_date >= stageStart) addTo(totalsStage, m);
    addTo(running, m);
    if (s.block_id) blockSeen.add(s.block_id);
    for (const c of CATEGORIES) {
      while (Math.floor(running[c] / thresholds[c]) > bricksEmitted[c]) {
        bricksEmitted[c]++;
        events.push({ type: 'brick', cat: c, date: s.session_date, n: bricksEmitted[c], session_id: s.id });
      }
    }
  }

  // block 完成 → 層線（block 已結束且有紀錄）
  const today = new Date().toISOString().slice(0, 10);
  for (const id of blockSeen) {
    const b = blockById[id];
    if (b && b.end_date && b.end_date < today) {
      events.push({ type: 'layer', date: b.end_date, title: b.title, block_id: b.id });
    }
  }
  for (const t of turningBlocks) {
    events.push({ type: 'wild', id: t.id, tier: t.tier, reason_type: t.reason_type, sentence: t.sentence, date: t.granted_on });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || (a.type === 'layer' ? 1 : 0) - (b.type === 'layer' ? 1 : 0));

  return {
    targets: Object.fromEntries(CATEGORIES.map(c => [c, targets[c] || { target: 0, tol: 5 }])),
    thresholds,
    totals_all: totalsAll,
    totals_stage: totalsStage,
    pct_all: pctOf(totalsAll),
    pct_stage: pctOf(totalsStage),
    bricks: bricksFor(totalsAll, thresholds),
    tower_events: events,
    per_session: perSession,
    brick_total: CATEGORIES.reduce((a, c) => a + bricksEmitted[c], 0),
  };
}

export function weekOf(block, dateStr) {
  if (!block?.start_date) return null;
  const start = new Date(block.start_date + 'T00:00:00Z');
  const d = new Date(dateStr + 'T00:00:00Z');
  const w = Math.floor((d - start) / 604800000) + 1;
  return Math.min(Math.max(w, 1), block.weeks || 6);
}

export function shapeBlock(b, exercises) {
  return {
    id: b.id, owner_type: b.owner_type, owner_id: b.owner_id, season_id: b.season_id,
    title: b.title, goal_text: b.goal_text, main_axis: b.main_axis, intensity: b.intensity,
    weeks: b.weeks, start_date: b.start_date, end_date: b.end_date, ramp_template_id: b.ramp_template_id,
    raise_types: parseJson(b.raise_types, []), pot_types: parseJson(b.pot_types, []),
    act_types: parseJson(b.act_types, ['activation']), mob_types: parseJson(b.mob_types, ['dynamic_fms']),
    sort_order: b.sort_order,
    goal_kind: b.goal_kind || 'general', phase: b.phase || '',
    emphasis: parseJson(b.emphasis, {}), goal_template_id: b.goal_template_id,
    exercises: exercises.map(e => ({
      id: e.id, segment: SEGMENTS.includes(e.segment) ? e.segment : 'main', name: e.name, target_movement: e.target_movement,
      category: e.category, doses: parseJson(e.doses, []), sort_order: e.sort_order,
    })),
  };
}

/** 找出某 owner（組或個人）在 dateStr 當天生效的 block；找不到就回最近的下一個或最後一個 */
export function pickBlock(blocks, dateStr) {
  let current = null;
  for (const b of blocks) {
    if (b.start_date && b.start_date <= dateStr && (!b.end_date || b.end_date >= dateStr)) current = b;
  }
  return current;
}
