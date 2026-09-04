/**
 * /api/goal-templates — 中期目標範本（4–6 週的訓練方向）
 * GET     公開，讓學員頁也能顯示目標說明
 * POST    教練：新增自訂範本
 * PUT ?id 教練：修改（內建的也能改）
 * DELETE ?id  教練：刪除（內建的不給刪，避免砍光）
 */
import { CATEGORIES, AXES, json, parseJson } from '../_shared/model.js';
import { requireAuth } from '../_shared/verify.js';

function cleanEmphasis(v) {
  const src = typeof v === 'string' ? parseJson(v, {}) : (v || {});
  const out = {};
  let sum = 0;
  for (const c of CATEGORIES) {
    const n = Math.max(0, Math.min(100, Math.round(Number(src[c]) || 0)));
    out[c] = n; sum += n;
  }
  return sum > 0 ? out : null; // 全 0 視為「沿用階段建議值」
}

function fields(b) {
  const em = cleanEmphasis(b.emphasis);
  return {
    name: String(b.name || '').trim().slice(0, 60) || '未命名目標',
    kind: b.kind === 'competition' ? 'competition' : 'general',
    phase: String(b.phase || '').slice(0, 20),
    weeks: Math.min(Math.max(parseInt(b.weeks, 10) || 6, 1), 12),
    main_axis: AXES.includes(b.main_axis) ? b.main_axis : 'strength',
    emphasis: JSON.stringify(em || {}),
    note: String(b.note || '').slice(0, 300),
    sort_order: parseInt(b.sort_order, 10) || 50,
  };
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  try {
    if (request.method === 'GET') {
      const rows = (await env.DB.prepare('SELECT * FROM goal_templates ORDER BY kind, sort_order, id').all()).results;
      return json({ templates: rows.map(t => ({ ...t, emphasis: parseJson(t.emphasis, {}) })) });
    }

    if (!(await requireAuth(request, env))) return json({ error: 'Unauthorized' }, 401);

    if (request.method === 'POST') {
      const f = fields(await request.json());
      const r = await env.DB.prepare(
        'INSERT INTO goal_templates (name, kind, phase, weeks, main_axis, emphasis, note, is_builtin, sort_order) VALUES (?,?,?,?,?,?,?,0,?)'
      ).bind(f.name, f.kind, f.phase, f.weeks, f.main_axis, f.emphasis, f.note, f.sort_order).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }

    if (request.method === 'PUT') {
      if (!id) return json({ error: 'id 必填' }, 400);
      const f = fields(await request.json());
      await env.DB.prepare(
        'UPDATE goal_templates SET name=?, kind=?, phase=?, weeks=?, main_axis=?, emphasis=?, note=?, sort_order=? WHERE id=?'
      ).bind(f.name, f.kind, f.phase, f.weeks, f.main_axis, f.emphasis, f.note, f.sort_order, id).run();
      return json({ ok: true });
    }

    if (request.method === 'DELETE') {
      if (!id) return json({ error: 'id 必填' }, 400);
      const t = await env.DB.prepare('SELECT is_builtin FROM goal_templates WHERE id=?').bind(id).first();
      if (!t) return json({ error: 'Not found' }, 404);
      if (t.is_builtin) return json({ error: '內建範本不能刪，可以直接改內容' }, 400);
      await env.DB.prepare('DELETE FROM goal_templates WHERE id=?').bind(id).run();
      return json({ ok: true });
    }
    return new Response('Method Not Allowed', { status: 405 });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
