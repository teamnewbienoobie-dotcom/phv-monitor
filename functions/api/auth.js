/**
 * Cloudflare Pages Functions — /api/auth
 *
 * POST { password } → 驗證密碼，成功回傳 { token }
 * GET  Authorization: Bearer <token> → 驗證 token 是否有效
 *
 * 環境變數（在 Cloudflare Dashboard 設定）：
 *   ADMIN_PASSWORD  — 後台密碼
 *   ADMIN_SECRET    — 用來簽發 token 的隨機字串（至少 32 字元）
 */

async function makeToken(secret) {
  const payload = Date.now().toString();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');
  return `${payload}.${sigHex}`;
}

async function verifyToken(token, secret) {
  try {
    const [payload, sigHex] = token.split('.');
    if (!payload || !sigHex) return false;

    // token 有效期：24 小時
    const ts = parseInt(payload, 10);
    if (Date.now() - ts > 86400_000) return false;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const expectedHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');
    return sigHex === expectedHex;
  } catch {
    return false;
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
  const ADMIN_SECRET   = env.ADMIN_SECRET;

  if (!ADMIN_PASSWORD || !ADMIN_SECRET) {
    return Response.json({ error: 'Server not configured' }, { status: 500 });
  }

  // ── GET：驗證 token ────────────────────────────────
  if (method === 'GET') {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const valid = token ? await verifyToken(token, ADMIN_SECRET) : false;
    return valid
      ? Response.json({ ok: true })
      : Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── POST：驗證密碼，簽發 token ─────────────────────
  if (method === 'POST') {
    let body;
    try { body = await request.json(); } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (body.password !== ADMIN_PASSWORD) {
      // 固定延遲，防止時序攻擊
      await new Promise(r => setTimeout(r, 500));
      return Response.json({ error: 'Wrong password' }, { status: 401 });
    }

    const token = await makeToken(ADMIN_SECRET);
    return Response.json({ token });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
