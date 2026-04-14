/**
 * Cloudflare Pages Functions — /api/chat
 * 代理 Gemini API，含每日請求上限保護
 *
 * 環境變數：
 *   GEMINI_API_KEY    — Google AI Studio 免費 Key（不會被扣費，超限回 429）
 *   CHAT_DAILY_LIMIT  — 每日請求上限（選填，預設 1400，Gemini 免費上限是 1500）
 *
 * D1 資料表（第一次使用前需建立）：
 *   CREATE TABLE IF NOT EXISTS chat_quota (
 *     date TEXT PRIMARY KEY,
 *     count INTEGER NOT NULL DEFAULT 0
 *   );
 */

const DEFAULT_DAILY_LIMIT = 1400; // 保留 100 次緩衝，Gemini 免費上限 1500/天

export async function onRequestPost(context) {
  const { request, env } = context;
  const GEMINI_API_KEY = env.GEMINI_API_KEY;
  const DAILY_LIMIT    = parseInt(env.CHAT_DAILY_LIMIT || DEFAULT_DAILY_LIMIT, 10);

  if (!GEMINI_API_KEY) {
    return Response.json({ error: '聊天功能尚未設定，請聯絡管理員' }, { status: 503 });
  }

  // ── 每日配額檢查 ────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  try {
    // 取得今日使用量
    const row = await env.DB.prepare(
      'SELECT count FROM chat_quota WHERE date = ?'
    ).bind(today).first();

    const currentCount = row?.count ?? 0;

    if (currentCount >= DAILY_LIMIT) {
      return Response.json(
        { error: `今日 AI 問答使用量已達上限（${DAILY_LIMIT} 次），請明天再試。` },
        { status: 429 }
      );
    }
  } catch {
    // D1 查詢失敗時放行（不因計數器問題阻擋使用者），但繼續執行
    console.warn('chat_quota read failed, skipping quota check');
  }

  // ── 解析請求 ────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { messages, systemPrompt } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Missing messages' }, { status: 400 });
  }

  // ── 呼叫 Gemini ─────────────────────────────────────
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: systemPrompt
          ? { parts: [{ text: systemPrompt }] }
          : undefined,
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
      })
    }
  );

  // ── 處理 Gemini 回應 ────────────────────────────────
  if (!geminiRes.ok) {
    const errData = await geminiRes.json().catch(() => ({}));

    // Gemini 免費上限（API Studio key 不會扣費，只會 429）
    if (geminiRes.status === 429) {
      return Response.json(
        { error: '今日 AI 問答使用量已達 Google 免費上限，請明天再試。' },
        { status: 429 }
      );
    }

    return Response.json(
      { error: errData?.error?.message || `Gemini HTTP ${geminiRes.status}` },
      { status: 502 }
    );
  }

  const data = await geminiRes.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return Response.json({ error: '回應解析失敗，請再試一次' }, { status: 502 });
  }

  // ── 更新每日計數 ────────────────────────────────────
  try {
    await env.DB.prepare(`
      INSERT INTO chat_quota (date, count) VALUES (?, 1)
      ON CONFLICT(date) DO UPDATE SET count = count + 1
    `).bind(today).run();
  } catch {
    console.warn('chat_quota update failed');
  }

  return Response.json({ text });
}
