/**
 * /api/seasons — 季（2–3 個 block 的上層目標）
 * POST {owner_type, owner_id, title, goal_text, start_date, end_date} / PUT ?id= / DELETE ?id=
 */
import { json } from '../_shared/model.js';
import { requireAuth } from '../_shared/verify.js';

export async function onRequest({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: 'Unauthorized' }, 401);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  try {
    if (request.method === 'POST') {
      const b = await request.json();
      const r = await env.DB.prepare('INSERT INTO seasons (owner_type, owner_id, title, goal_text, start_date, end_date) VALUES (?,?,?,?,?,?)')
        .bind(b.owner_type, parseInt(b.owner_id, 10), String(b.title || '').trim() || '未命名季', String(b.goal_text || ''), b.start_date || '', b.end_date || '').run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
    if (request.method === 'PUT') {
      const b = await request.json();
      await env.DB.prepare('UPDATE seasons SET title=?, goal_text=?, start_date=?, end_date=? WHERE id=?')
        .bind(String(b.title || '').trim(), String(b.goal_text || ''), b.start_date || '', b.end_date || '', id).run();
      return json({ ok: true });
    }
    if (request.method === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('UPDATE blocks SET season_id=NULL WHERE season_id=?').bind(id),
        env.DB.prepare('DELETE FROM seasons WHERE id=?').bind(id),
      ]);
      return json({ ok: true });
    }
    return new Response('Method Not Allowed', { status: 405 });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
