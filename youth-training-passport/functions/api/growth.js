/**
 * /api/growth — 身高體重紀錄（教練）
 * POST { athlete_id(public_id), measured_on, height_cm, weight_kg } / DELETE ?id=
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
      const h = b.height_cm ? parseFloat(b.height_cm) : null, w = b.weight_kg ? parseFloat(b.weight_kg) : null;
      if (!h && !w) return json({ error: '身高或體重至少填一個' }, 400);
      const r = await env.DB.prepare('INSERT INTO growth_log (athlete_id, measured_on, height_cm, weight_kg) VALUES (?,?,?,?)')
        .bind(a.id, b.measured_on || new Date().toISOString().slice(0, 10), h, w).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM growth_log WHERE id=?').bind(url.searchParams.get('id')).run();
      return json({ ok: true });
    }
    return new Response('Method Not Allowed', { status: 405 });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
