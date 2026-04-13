/**
 * Cloudflare Pages Functions — /api/records
 * GET  ?name=小明  → 回傳該人歷史紀錄（最新 20 筆，由新到舊）
 * POST body JSON   → 存入新的測量紀錄
 */
export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // Preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  // ── GET：查詢歷史紀錄 ──────────────────────────────
  if (method === 'GET') {
    const url = new URL(request.url);
    const name = url.searchParams.get('name')?.trim();

    // 沒有 name → 回傳所有運動員摘要
    if (!name) {
      try {
        const { results } = await env.DB.prepare(
          `SELECT name,
                  COUNT(*) as count,
                  MAX(date) as last_date,
                  (SELECT stage FROM phv_records p2
                   WHERE p2.name = p1.name
                   ORDER BY date DESC LIMIT 1) as last_stage
           FROM phv_records p1
           GROUP BY name
           ORDER BY last_date DESC`
        ).all();
        return Response.json(results);
      } catch (err) {
        console.error('GET all error:', err);
        return Response.json({ error: 'database error' }, { status: 500 });
      }
    }

    try {
      const { results } = await env.DB.prepare(
        `SELECT id, date, mo, height, stage
         FROM phv_records
         WHERE name = ?
         ORDER BY date DESC
         LIMIT 20`
      ).bind(name).all();

      return Response.json(results);
    } catch (err) {
      console.error('GET error:', err);
      return Response.json({ error: 'database error' }, { status: 500 });
    }
  }

  // ── POST：存入新紀錄 ───────────────────────────────
  if (method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'invalid JSON' }, { status: 400 });
    }

    const {
      name, gender, date, age, height,
      sit_height, weight, mo, phv_age, stage
    } = body;

    // 必填欄位驗證
    if (
      !name || !gender || !date ||
      age == null || height == null || sit_height == null ||
      weight == null || mo == null || phv_age == null || !stage
    ) {
      return Response.json({ error: 'missing required fields' }, { status: 400 });
    }

    try {
      const result = await env.DB.prepare(
        `INSERT INTO phv_records
         (name, gender, date, age, height, sit_height, weight, mo, phv_age, stage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        String(name).trim(),
        gender,
        date,
        Number(age),
        Number(height),
        Number(sit_height),
        Number(weight),
        Number(mo),
        Number(phv_age),
        stage
      ).run();

      return Response.json({ success: true, id: result.meta.last_row_id });
    } catch (err) {
      console.error('POST error:', err);
      return Response.json({ error: 'database error' }, { status: 500 });
    }
  }

  // ── DELETE：刪除紀錄 ──────────────────────────────
  if (method === 'DELETE') {
    const url = new URL(request.url);
    const id   = url.searchParams.get('id');
    const name = url.searchParams.get('name')?.trim();

    try {
      if (id) {
        // 刪單筆
        await env.DB.prepare(`DELETE FROM phv_records WHERE id = ?`).bind(Number(id)).run();
        return Response.json({ success: true });
      } else if (name) {
        // 刪整個人
        await env.DB.prepare(`DELETE FROM phv_records WHERE name = ?`).bind(name).run();
        return Response.json({ success: true });
      } else {
        return Response.json({ error: 'need id or name' }, { status: 400 });
      }
    } catch (err) {
      console.error('DELETE error:', err);
      return Response.json({ error: 'database error' }, { status: 500 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}
