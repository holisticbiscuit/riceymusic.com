import { safeEqual, signToken, verifyToken } from './auth'
import { lookup, parseLink } from './lookup'
import { duplicateId, readCredits, validateCredit, writeCredits, type Credit } from './credits'
import { DATA_PATH, audioPath, isSha, validateEntry, type ABEntry } from './ab'
import { GitHubError, commit, createBlob, readText, type Repo } from './github'

export interface Env {
  CREDITS: KVNamespace
  ADMIN_USER: string
  ADMIN_PASS: string
  TOKEN_SECRET: string
  ALLOWED_ORIGINS: string
  // Before / After uploads commit to the site's repo. GITHUB_TOKEN is a secret: a fine-grained
  // token for that one repo with Contents read and write.
  GITHUB_TOKEN?: string
  GITHUB_REPO: string
  GITHUB_BRANCH: string
}

const MAX_CLIP_BYTES = 20 * 1024 * 1024

const MAX_FAILS = 5
const LOCK_SECONDS = 15 * 60

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('origin') ?? ''
    const cors: Record<string, string> = {
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    // Before / After pairs, stored in the site's repo.
    if (url.pathname === '/ab' || url.pathname.startsWith('/ab/')) {
      if (!env.GITHUB_TOKEN) return json({ error: 'Uploads aren’t set up yet: the Worker has no GITHUB_TOKEN' }, 503)
      const repo: Repo = { token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO, branch: env.GITHUB_BRANCH }
      const readData = async () => JSON.parse((await readText(repo, DATA_PATH)) ?? '{}') as Record<string, ABEntry>
      const writeData = (data: Record<string, ABEntry>) => ({ path: DATA_PATH, text: JSON.stringify(data) + '\n' })
      try {
        if (req.method === 'GET' && url.pathname === '/ab') return json(await readData(), 200, { 'cache-control': 'no-store' })

        // One MP3, as {"content": base64, "encoding": "base64"}. Returns its blob sha.
        if (req.method === 'POST' && url.pathname === '/ab/blob') {
          const size = Number(req.headers.get('content-length') ?? 0)
          if (!size || size > MAX_CLIP_BYTES * 1.4) return json({ error: 'That clip is too big (20 MB at most)' }, 413)
          return json(await createBlob(repo, await req.arrayBuffer()))
        }

        // Publish a pair: {entry, blobs: {before, after}}. Replaces one with the same title.
        if (req.method === 'POST' && url.pathname === '/ab') {
          const body = (await req.json().catch(() => ({}))) as { entry?: unknown; blobs?: { before?: unknown; after?: unknown } }
          const r = validateEntry(body.entry)
          if (!r.ok) return json({ error: r.error }, 400)
          if (!isSha(body.blobs?.before) || !isSha(body.blobs?.after)) return json({ error: 'Upload the two clips first' }, 400)
          const data = await readData()
          const replacing = r.id in data
          data[r.id] = r.entry
          const sha = await commit(repo, `Before / After: ${replacing ? 'replace' : 'add'} ${r.entry.title}`, [
            { path: audioPath(r.id, 'before'), sha: body.blobs.before },
            { path: audioPath(r.id, 'after'), sha: body.blobs.after },
            writeData(data),
          ])
          return json({ id: r.id, entry: r.entry, commit: sha })
        }

        const del = /^\/ab\/([a-z0-9-]+)$/.exec(url.pathname)
        if (req.method === 'DELETE' && del) {
          const id = del[1]
          const data = await readData()
          if (!(id in data)) return json({ error: 'Not found' }, 404)
          const title = data[id].title
          delete data[id]
          const sha = await commit(repo, `Before / After: remove ${title}`, [
            { path: audioPath(id, 'before'), remove: true },
            { path: audioPath(id, 'after'), remove: true },
            writeData(data),
          ])
          return json({ id, commit: sha })
        }
      } catch (e) {
        if (e instanceof GitHubError) return json({ error: `GitHub: ${e.message}` }, 502)
        throw e
      }
    }

    return json({ error: 'Not found' }, 404)
  },
}
