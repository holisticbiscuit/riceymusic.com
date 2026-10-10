export type Link = { kind: 'spotify' | 'apple'; id: string }
export type Found = { title: string; artist: string; date: string; art: string }

// Spotify track or Apple Music song links only; anything else is refused.
export function parseLink(raw: string): Link | null {
  let u: URL
  try { u = new URL(raw) } catch { return null }
  if (u.hostname === 'open.spotify.com') {
    const m = u.pathname.match(/\/track\/([A-Za-z0-9]{22})$/)
    return m ? { kind: 'spotify', id: m[1] } : null
  }
  if (u.hostname === 'music.apple.com') {
    const id = u.searchParams.get('i') ?? u.pathname.match(/\/song\/[^/]+\/(\d+)$/)?.[1]
    return id && /^\d+$/.test(id) ? { kind: 'apple', id } : null
  }
  return null
}

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')

const meta = (html: string, key: string) =>
  decode(html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1] ?? '')

// The public track page carries everything in meta tags; og:description reads
// "ARTIST · Title · Song · 2026".
export function parseSpotifyPage(html: string): Found {
  return {
    title: meta(html, 'og:title'),
    artist: meta(html, 'og:description').split(' · ')[0] ?? '',
    date: meta(html, 'music:release_date'),
    art: meta(html, 'og:image'),
  }
}

type ItunesTrack = { wrapperType: string; trackName: string; artistName: string; releaseDate: string; artworkUrl100: string }

export async function lookup(link: Link): Promise<Found> {
  if (link.kind === 'spotify') {
    const r = await fetch(`https://open.spotify.com/track/${link.id}`, { headers: { 'user-agent': 'Mozilla/5.0' } })
    if (!r.ok) throw new Error(`Spotify answered ${r.status}`)
    const found = parseSpotifyPage(await r.text())
    if (!found.title) throw new Error('Could not read that Spotify track')
    return found
  }
  const r = await fetch(`https://itunes.apple.com/lookup?id=${link.id}&entity=song`)
  const j = (await r.json()) as { results?: ItunesTrack[] }
  const t = j.results?.find(x => x.wrapperType === 'track')
  if (!t) throw new Error('Not found on Apple Music')
  return {
    title: t.trackName,
    artist: t.artistName,
    date: String(t.releaseDate).slice(0, 10),
    art: String(t.artworkUrl100).replace('100x100bb', '1000x1000bb'),
  }
}
