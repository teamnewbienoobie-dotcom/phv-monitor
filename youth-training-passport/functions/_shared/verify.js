export async function verifyToken(token, secret) {
  try {
    const [payload, sigHex] = (token || '').split('.');
    if (!payload || !sigHex) return false;
    const ts = parseInt(payload, 10);
    if (!ts || Date.now() - ts > 86400_000) return false;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const expectedHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    return sigHex === expectedHex;
  } catch {
    return false;
  }
}

export async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return false;
  return verifyToken(token, env.ADMIN_SECRET);
}
