/**
 * Cloudflare Pages Functions — /api/chat
 * 代理 Gemini API，讓前端不需暴露 API Key
 *
 * 環境變數（Cloudflare Dashboard → Settings → Environment variables）：
 *   GEMINI_API_KEY  — Google AI Studio 免費 Key
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  const GEMINI_API_KEY = env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return Response.json({ error: '聊天功能尚未設定，請聯絡管理員' }, { status: 503 });
  }

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

  if (!geminiRes.ok) {
    const errData = await geminiRes.json().catch(() => ({}));
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

  return Response.json({ text });
}
