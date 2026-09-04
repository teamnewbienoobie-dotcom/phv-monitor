/**
 * /api/stage-targets — 7 × 3 目標比重
 * GET 公開；PUT { rows: [{stage, category, target_pct, tolerance_pct}] } 教練
 */
import { CATEGORIES, STAGES, json } from '../_shared/model.js';
import { requireAuth } from '../_shared/verify.js';
import { loadTargets } from '../_shared/stats.js';

export async function onRequest({ request, env }) {
  try {
    if (request.method === 'GET') return json({ targets: await loadTargets(env) });
    if (request.method === 'PUT') {
      if (!(await requireAuth(request, env))) return json({ error: 'Unauthorized' }, 401);
      const b = await request.json();
      const stmts = [];
      for (const r of b.rows || []) {
        if (!STAGES.includes(r.stage) || !CATEGORIES.includes(r.category)) continue;
        stmts.push(env.DB.prepare('INSERT OR REPLACE INTO stage_targets (stage, category, target_pct, tolerance_pct) VALUES (?,?,?,?)')
          .bind(r.stage, r.category, parseFloat(r.target_pct) || 0, parseFloat(r.tolerance_pct) || 5));
      }
      if (stmts.length) await env.DB.batch(stmts);
      return json({ ok: true, targets: await loadTargets(env) });
    }
    return new Response('Method Not Allowed', { status: 405 });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
