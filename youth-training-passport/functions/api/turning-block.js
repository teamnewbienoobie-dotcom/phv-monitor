/**
 * /api/turning-block — 突破構件（教練頒發）
 * POST { athlete_id(public_id), tier: gold|silver|rainbow, reason_type, sentence, granted_on }
 * DELETE ?id=
 */
import { json } from '../_shared/model.js';
import { requireAuth } from '../_shared/verify.js';

export async function onRequest({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: 'Unauthorized' }, 401);
  const url = new URL(request.url);
  try {
    if (request.method === 'POST') {
      const b = await request.json();
      const a = await env.DB.prepare('SELECT id FROM athletes WHERE public_id=? COLLATE NOCASE').bind(String(b.athlete_id || '')).first();
      if (!a) return json({ error: '找不到學員' }, 404);
      const tier = ['gold', 'silver', 'rainbow'].includes(b.tier) ? b.tier : 'silver';
      const reason = ['pr', 'attendance', 'level_up', 'block_done', 'custom'].includes(b.reason_type) ? b.reason_type : 'custom';
      const sentence = String(b.sentence || '').trim();
      if (!sentence) return json({ error: '要寫一句話刻在方塊上' }, 400);
      const r = await env.DB.prepare('INSERT INTO turning_blocks (athlete_id, tier, reason_type, sentence, granted_on) VALUES (?,?,?,?,?)')
        .bind(a.id, tier, reason, sentence.slice(0, 120), b.granted_on || new Date().toISOString().slice(0, 10)).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM turning_blocks WHERE id=?').bind(url.searchParams.get('id')).run();
      return json({ ok: true });
    }
    return new Response('Method Not Allowed', { status: 405 });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
