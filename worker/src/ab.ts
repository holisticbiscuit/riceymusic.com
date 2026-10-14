// Before / After pairs: what the admin may publish, and where it goes in the site's repo.
export const MODES = ['Mixing', 'Mastering', 'Mixing & mastering'] as const
export const DATA_PATH = 'src/data/ab-tracks.json'
export const audioPath = (id: string, v: 'before' | 'after') => `public/audio/ab/${id}-${v}.mp3`

export type ABEntry = {
  title: string
  artist: string
  art?: string
  date: string
  mode: (typeof MODES)[number]
  src: { before: string; after: string }
  lufs: { before: number; after: number }
  duration: number
  peaks: { before: number[]; after: number[] }
}

export const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN)
const isPeaks = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === 160 && v.every(x => typeof x === 'number' && x >= 0 && x <= 1)

// Checks what the admin sent and builds the stored entry; the id and file paths come from the
// title here, never from the request.
export function validateEntry(input: unknown): { ok: true; id: string; entry: ABEntry } | { ok: false; error: string } {
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const title = str(o.title)
  const artist = str(o.artist)
  const art = str(o.art)
  const date = str(o.date)
  const mode = str(o.mode)
  const lufs = (o.lufs ?? {}) as Record<string, unknown>
  const peaks = (o.peaks ?? {}) as Record<string, unknown>
  const duration = num(o.duration)

  if (!title || !artist) return { ok: false, error: 'Title and artist are required' }
  const id = slug(title)
  if (!id) return { ok: false, error: 'The title needs some letters or numbers' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'Date must be yyyy-mm-dd' }
  if (!(MODES as readonly string[]).includes(mode)) return { ok: false, error: 'Pick Mixing, Mastering or Mixing & mastering' }
  if (art && !/^https?:\/\//.test(art) && !/^\/images\/[\w./-]+$/.test(art)) return { ok: false, error: 'Cover must be a link' }
  if (!(duration > 5 && duration < 600)) return { ok: false, error: 'Clip length looks wrong' }
  const lb = num(lufs.before), la = num(lufs.after)
  if (!(lb > -70 && lb < 5 && la > -70 && la < 5)) return { ok: false, error: 'Loudness values look wrong' }
  if (!isPeaks(peaks.before) || !isPeaks(peaks.after)) return { ok: false, error: 'Waveform data looks wrong' }

  return {
    ok: true,
    id,
    entry: {
      title,
      artist,
      ...(art && { art }),
      date,
      mode: mode as ABEntry['mode'],
      src: { before: `/audio/ab/${id}-before.mp3`, after: `/audio/ab/${id}-after.mp3` },
      lufs: { before: lb, after: la },
      duration: Math.round(duration * 100) / 100,
      peaks: { before: peaks.before, after: peaks.after },
    },
  }
}

export const isSha = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{40}$/.test(v)
