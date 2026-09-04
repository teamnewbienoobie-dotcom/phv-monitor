/**
 * /api/focus-level — RAMP Focus 等級（教練）
 * POST { athlete_id(public_id), focus_key, level(1-3), achieved_on }  寫入一筆歷史（最新一筆＝現況）
 */
import { json } from '../_shared/model.js';
import { requireAuth } from '../_shared/verify.js';

export async function onRequest({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: 'Unauthorized' }, 401);
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const b = await request.json();
    const a = await env.DB.prepare('SELECT id FROM athletes WHERE public_id=? COLLATE NOCASE').bind(String(b.athlete_id || '')).first();
    if (!a) return json({ error: '找不到學員' }, 404);
    const level = Math.min(3, Math.max(0, parseInt(b.level, 10) || 0));
    const key = String(b.focus_key || '').trim();
    if (!key) return json({ error: 'focus_key 必填' }, 400);
    await env.DB.prepare('INSERT INTO focus_levels (athlete_id, focus_key, level, achieved_on) VALUES (?,?,?,?)')
      .bind(a.id, key, level, b.achieved_on || new Date().toISOString().slice(0, 10)).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
