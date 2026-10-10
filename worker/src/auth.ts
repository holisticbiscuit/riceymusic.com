const enc = new TextEncoder()

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Compares HMACs of both values under a throwaway key, so the comparison runs over two
// equal-length digests and its timing says nothing about the inputs.
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const key = crypto.randomUUID()
  const [x, y] = await Promise.all([hmac(key, a), hmac(key, b)])
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i)
  return diff === 0 && a.length > 0
}

// Token: "<expiry, unix seconds>.<hmac of expiry>"
export async function signToken(secret: string, now: number, ttl = 12 * 3600): Promise<string> {
  const exp = String(Math.floor(now) + ttl)
  return `${exp}.${await hmac(secret, exp)}`
}

export async function verifyToken(secret: string, token: string, now: number): Promise<boolean> {
  const [exp, sig] = token.split('.')
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false
  return safeEqual(sig, await hmac(secret, exp))
}
