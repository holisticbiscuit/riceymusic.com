export const ROLES = ['Composer', 'Producer', 'Lyricist', 'Mixing', 'Mastering'] as const

export type Credit = {
  id: string
  title: string
  artist: string
  roles: string[]
  date: string
  art?: string
  url?: string
  versions?: string[]
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const isHttp = (v: string) => /^https?:\/\//.test(v)
// Bundled covers live on the site itself.
const isSiteImage = (v: string) => /^\/images\/[\w./-]+$/.test(v)
const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function validateCredit(input: unknown): { ok: true; credit: Credit } | { ok: false; error: string } {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const title = str(o.title)
  const artist = str(o.artist)
  const date = str(o.date)
  const art = str(o.art)
  const url = str(o.url)
  const roles = Array.isArray(o.roles) ? o.roles.map(str) : []
  const versions = Array.isArray(o.versions) ? o.versions.map(str).filter(Boolean) : []

  if (!title || !artist) return { ok: false, error: 'Title and artist are required' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'Date must be yyyy-mm-dd' }
  if (!roles.length || roles.some(r => !(ROLES as readonly string[]).includes(r))) return { ok: false, error: 'Pick at least one valid role' }
  if (art && !isHttp(art) && !isSiteImage(art)) return { ok: false, error: 'Cover must be an http(s) link' }
  if (url && !isHttp(url)) return { ok: false, error: 'Link must start with http(s)://' }

  return {
    ok: true,
    credit: {
      id: str(o.id) || slug(`${artist.split(',')[0]}-${title}`),
      title,
      artist,
      roles,
      date,
      ...(art && { art }),
      ...(url && { url }),
      ...(versions.length > 0 && { versions }),
    },
  }
}

export async function readCredits(kv: KVNamespace): Promise<Credit[]> {
  return ((await kv.get('credits', 'json')) as Credit[] | null) ?? []
}

export async function writeCredits(kv: KVNamespace, list: Credit[]) {
  await kv.put('credits', JSON.stringify(list))
}

export function duplicateId(list: { id: string }[]): string | null {
  const seen = new Set<string>()
  for (const { id } of list) {
    if (seen.has(id)) return id
    seen.add(id)
  }
  return null
}
