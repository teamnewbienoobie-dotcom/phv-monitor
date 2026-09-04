/**
 * /api/groups — 訓練組（教練）
 * GET 列表（含成員數） / POST {name, notes} / PUT ?id= / DELETE ?id=（成員改為無組別）
 */
import { json } from '../_shared/model.js';
import { requireAuth } from '../_shared/verify.js';

export async function onRequest({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: 'Unauthorized' }, 401);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  try {
    if (request.method === 'GET') {
      const groups = (await env.DB.prepare(
        'SELECT g.*, (SELECT count(*) FROM athletes a WHERE a.group_id=g.id) AS member_count FROM groups g ORDER BY g.name'
      ).all()).results;
      return json({ groups });
    }
    if (request.method === 'POST') {
      const b = await request.json();
      const name = String(b.name || '').trim();
      if (!name) return json({ error: 'name 必填' }, 400);
      const r = await env.DB.prepare('INSERT INTO groups (name, notes) VALUES (?,?)').bind(name, String(b.notes || '')).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
    if (request.method === 'PUT') {
      const b = await request.json();
      await env.DB.prepare('UPDATE groups SET name=?, notes=? WHERE id=?').bind(String(b.name || '').trim(), String(b.notes || ''), id).run();
      return json({ ok: true });
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('UPDATE athletes SET group_id=NULL WHERE group_id=?').bind(id).run();
      await env.DB.prepare('DELETE FROM groups WHERE id=?').bind(id).run();
      return json({ ok: true });
    }
    return new Response('Method Not Allowed', { status: 405 });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
