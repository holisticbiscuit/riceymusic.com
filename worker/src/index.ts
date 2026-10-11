import { safeEqual, signToken, verifyToken } from './auth'
import { lookup, parseLink } from './lookup'
import { duplicateId, readCredits, validateCredit, writeCredits, type Credit } from './credits'

export interface Env {
  CREDITS: KVNamespace
  ADMIN_USER: string
  ADMIN_PASS: string
  TOKEN_SECRET: string
  ALLOWED_ORIGINS: string
}

const MAX_FAILS = 5
const LOCK_SECONDS = 15 * 60

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('origin') ?? ''
    const cors: Record<string, string> = {
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
      vary: 'origin',
    }
    if (env.ALLOWED_ORIGINS.split(',').includes(origin)) cors['access-control-allow-origin'] = origin

    const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors, ...extra } })

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (!env.ADMIN_USER || !env.ADMIN_PASS || !env.TOKEN_SECRET) return json({ error: 'Server is missing its secrets' }, 500)

    const url = new URL(req.url)
    const now = Date.now() / 1000

    if (req.method === 'GET' && url.pathname === '/credits') {
      // no-cache: browsers always check back, so an admin change shows on the next page load.
      return json(await readCredits(env.CREDITS), 200, { 'cache-control': 'no-cache' })
    }

    if (req.method === 'POST' && url.pathname === '/login') {
      const ip = req.headers.get('cf-connecting-ip') ?? 'unknown'
      const key = `fails:${ip}`
      const fails = Number((await env.CREDITS.get(key)) ?? 0)
      if (fails >= MAX_FAILS) return json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429)

      const body = (await req.json().catch(() => ({}))) as { username?: unknown; password?: unknown }
      // Both are compared every time, so timing does not reveal which one was wrong.
      const userOk = await safeEqual(String(body.username ?? ''), env.ADMIN_USER)
      const passOk = await safeEqual(String(body.password ?? ''), env.ADMIN_PASS)
      if (!(userOk && passOk)) {
        await env.CREDITS.put(key, String(fails + 1), { expirationTtl: LOCK_SECONDS })
        return json({ error: 'Wrong username or password' }, 401)
      }
      await env.CREDITS.delete(key)
      return json({ token: await signToken(env.TOKEN_SECRET, now) })
    }

    // Everything below needs a valid token.
    const token = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
    if (!(await verifyToken(env.TOKEN_SECRET, token, now))) return json({ error: 'Not signed in' }, 401)

    if (req.method === 'GET' && url.pathname === '/lookup') {
      const raw = url.searchParams.get('url') ?? ''
      const link = parseLink(raw)
      if (!link) return json({ error: 'Paste a Spotify or Apple Music track link' }, 400)
      try {
        // Spotify's ?si= is a share tracker; Apple's ?i= is the track itself.
        return json({ ...(await lookup(link)), url: link.kind === 'spotify' ? raw.split('?')[0] : raw })
      } catch (e) {
        return json({ error: (e as Error).message || 'Lookup failed' }, 502)
      }
    }

    // PUT replaces the whole ordered list (the admin saves after every add, edit,
    // delete or reorder). The list is small, so one write keeps it simple.
    if (req.method === 'PUT' && url.pathname === '/credits') {
      const items = await req.json().catch(() => null)
      if (!Array.isArray(items)) return json({ error: 'Expected a list' }, 400)
      if (items.length > 500) return json({ error: 'Too many credits' }, 400)
      const out: Credit[] = []
      for (const item of items) {
        const r = validateCredit(item)
        if (!r.ok) return json({ error: `${(item as { title?: string })?.title || 'A credit'}: ${r.error}` }, 400)
        out.push(r.credit)
      }
      const dup = duplicateId(out)
      if (dup) {
        const c = out.find(x => x.id === dup)!
        return json({ error: `${c.title} by ${c.artist} is already in the list` }, 409)
      }
      await writeCredits(env.CREDITS, out)
      return json(out)
    }

    return json({ error: 'Not found' }, 404)
  },
}
