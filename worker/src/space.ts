// Worlds: everyone on the page is a light in one shared space. Each browser sends where its light
// is a few times a second; the room relays it to everyone else. Nothing is stored: no names, no IP
// addresses, just a position, a velocity, which world it's in and the rough city Cloudflare gives.

export type Where = 'space' | 'years'
export type Vec = [number, number, number]
export type Move = { p: Vec; v: Vec; w: Where }

// Upper bounds that keep the room (and the free plan) safe from a runaway or hostile client.
export const MAX_LIGHTS = 200
export const MIN_GAP_MS = 150 // a client may send about 6 updates a second, more are dropped
const MAX_COORD = 200
const MAX_SPEED = 40
const WHERE: readonly Where[] = ['space', 'years']

const vec = (x: unknown, max: number): Vec | null => {
  if (!Array.isArray(x) || x.length !== 3) return null
  const out = x.map(Number) as Vec
  if (!out.every(n => Number.isFinite(n) && Math.abs(n) <= max)) return null
  // Two decimals is plenty for a light in the sky, and keeps every message short.
  return out.map(n => Math.round(n * 100) / 100) as Vec
}

// A client's update, or null when it is malformed or out of range.
export function parseMove(raw: unknown): Move | null {
  if (typeof raw !== 'string' || raw.length > 200) return null
  let m: { p?: unknown; v?: unknown; w?: unknown }
  try {
    m = JSON.parse(raw)
  } catch {
    return null
  }
  if (!m || typeof m !== 'object') return null
  const p = vec(m.p, MAX_COORD)
  const v = vec(m.v, MAX_SPEED)
  const w = WHERE.find(x => x === m.w)
  if (!p || !v || !w) return null
  return { p, v, w }
}

// The city a light is shown as being in ("Someone in London"). Cloudflare's guess, trimmed.
export function cityLabel(raw: string | null | undefined): string {
  const s = String(raw ?? '').replace(/[^\p{L}\p{M} .'-]/gu, '').trim().slice(0, 40)
  return s || 'somewhere'
}

// The site, plus local development and the prototype on the tailnet.
export function spaceOriginOk(origin: string, allowed: string): boolean {
  if (allowed.split(',').includes(origin)) return true
  try {
    const u = new URL(origin)
    if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true
    if (u.protocol === 'https:' && u.hostname.endsWith('.ts.net')) return true
  } catch {
    // not a URL
  }
  return false
}
