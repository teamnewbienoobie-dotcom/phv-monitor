/**
 * /api/session — 記錄一堂課（教練）
 * GET  ?id=<public_id>&date=YYYY-MM-DD  → 該日計畫預填（block、週次、本週處方、RAMP 型態）
 * POST { athlete_ids: [public_id,...], ...session 欄位, exercises: [] }  一次可寫多位學員
 * DELETE ?id=<session id>
 */
import { json, parseJson } from '../_shared/model.js';
import { requireAuth } from '../_shared/verify.js';
import { insertSession, blocksForAthlete, planForWeek } from '../_shared/sessions.js';
import { pickBlock, weekOf } from '../_shared/stats.js';

export async function onRequest({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: 'Unauthorized' }, 401);
  const url = new URL(request.url);
  try {
    if (request.method === 'GET') {
      const pid = url.searchParams.get('id');
      const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
      const athlete = await env.DB.prepare('SELECT * FROM athletes WHERE public_id=? COLLATE NOCASE').bind(pid).first();
      if (!athlete) return json({ error: 'Not found' }, 404);
      const blocks = await blocksForAthlete(env, athlete);
      const block = pickBlock(blocks, date);
      const week = block ? weekOf(block, date) : null;
      const tpl = block?.ramp_template_id ? await env.DB.prepare('SELECT * FROM ramp_templates WHERE id=?').bind(block.ramp_template_id).first() : null;
      return json({
        block: block ? { id: block.id, title: block.title, main_axis: block.main_axis, weeks: block.weeks, week_now: week,
          raise_types: parseJson(block.raise_types, []),
          act_types: parseJson(block.act_types, ['activation']), mob_types: parseJson(block.mob_types, ['dynamic_fms']),
          pot_types: parseJson(block.pot_types, []),
          raise_min: tpl?.raise_min ?? 5, act_min: tpl?.act_min ?? 4, mob_min: tpl?.mob_min ?? 4, pot_min: tpl?.pot_min ?? 5 } : null,
        plan: await planForWeek(env, block, week),
        blocks: blocks.map(b => ({ id: b.id, title: b.title, start_date: b.start_date, end_date: b.end_date })),
      });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const ids = Array.isArray(body.athlete_ids) ? body.athlete_ids : [body.athlete_id];
      if (!ids.length || !body.session_date) return json({ error: 'athlete_ids 與 session_date 必填' }, 400);
      const results = [];
      for (const pid of ids) {
        const athlete = await env.DB.prepare('SELECT * FROM athletes WHERE public_id=? COLLATE NOCASE').bind(String(pid)).first();
        if (!athlete) { results.push({ public_id: pid, error: '找不到學員' }); continue; }
        const r = await insertSession(env, athlete, body);
        results.push({ public_id: athlete.public_id, ...r });
      }
      return json({ ok: true, results });
    }

    if (request.method === 'PUT') {
      // 事後修改一堂已記錄的課：整堂重寫（含動作），保留 id 與學員
      const sid = url.searchParams.get('id');
      if (!sid) return json({ error: 'id 必填' }, 400);
      const old = await env.DB.prepare('SELECT * FROM sessions WHERE id=?').bind(sid).first();
      if (!old) return json({ error: 'Not found' }, 404);
      const athlete = await env.DB.prepare('SELECT * FROM athletes WHERE id=?').bind(old.athlete_id).first();
      const body = await request.json();
      await env.DB.batch([
        env.DB.prepare('DELETE FROM session_exercises WHERE session_id=?').bind(sid),
        env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(sid),
      ]);
      const r = await insertSession(env, athlete, { ...body, force_id: sid, session_date: body.session_date || old.session_date, source: old.source });
      return json({ ok: true, ...r });
    }

    if (request.method === 'DELETE') {
      const id = url.searchParams.get('id');
      await env.DB.batch([
        env.DB.prepare('DELETE FROM session_exercises WHERE session_id=?').bind(id),
        env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(id),
      ]);
      return json({ ok: true });
    }
    return new Response('Method Not Allowed', { status: 405 });
  } catch (err) {
    console.error('session error:', err);
    return json({ error: err.message }, 500);
  }
}
