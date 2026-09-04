/**
 * /api/auth — 教練密碼驗證（唯讀頁面本身不需要密碼，只有編輯模式需要）
 *
 * POST { password } → 回傳 { token }
 * GET  Authorization: Bearer <token> → 驗證 token 是否仍有效
 *
 * 環境變數：ADMIN_PASSWORD, ADMIN_SECRET（皆為 Pages secret，不寫在程式碼裡）
 */
import { verifyToken } from '../_shared/verify.js';

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
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${payload}.${sigHex}`;
}

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;
  const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
  const ADMIN_SECRET = env.ADMIN_SECRET;

  if (!ADMIN_PASSWORD || !ADMIN_SECRET) {
    return Response.json({ error: 'Server not configured' }, { status: 500 });
  }

  if (method === 'GET') {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const valid = token ? await verifyToken(token, ADMIN_SECRET) : false;
    return valid
      ? Response.json({ ok: true })
      : Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (method === 'POST') {
    let body;
    try { body = await request.json(); } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (body.password !== ADMIN_PASSWORD) {
      await new Promise(r => setTimeout(r, 500));
      return Response.json({ error: 'Wrong password' }, { status: 401 });
    }
    const token = await makeToken(ADMIN_SECRET);
    return Response.json({ token });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
