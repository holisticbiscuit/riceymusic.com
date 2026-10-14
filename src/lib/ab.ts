import abTracks from '../data/ab-tracks.json'
import { useABEngine, type Version } from './abEngine'

export type { Version }

export type Mode = 'Mixing' | 'Mastering' | 'Mixing & mastering'

// One before/after pair, as stored in src/data/ab-tracks.json. Made by the admin's upload
// (or scripts/ab-encode.mjs); each entry carries its own release details.
export type ABTrack = {
  id: string
  title: string
  artist: string
  art?: string
  date: string // release date, yyyy-mm-dd; the list is newest first
  mode: Mode // which comparison it appears under
  src: Record<Version, string>
  lufs: Record<Version, number> // integrated loudness (EBU R128) of each clip, for Level match
  duration: number
  peaks: Record<Version, number[]> // 160 RMS bins, normalised to the louder of the pair
}

export const toTracks = (data: Record<string, Omit<ABTrack, 'id'>>): ABTrack[] =>
  Object.entries(data)
    .map(([id, t]) => ({ ...t, id }))
    .sort((a, b) => b.date.localeCompare(a.date))

export const AB_TRACKS: ABTrack[] = toTracks(abTracks as Record<string, Omit<ABTrack, 'id'>>)

export const MODES: { mode: Mode; blurb: string }[] = [
  { mode: 'Mixing', blurb: 'Balance, space and punch. The raw stems against the finished mix.' },
  { mode: 'Mastering', blurb: 'Loudness, tone and translation. The finished mix against the release master.' },
  { mode: 'Mixing & mastering', blurb: 'The whole journey. The raw stems against the release-ready master.' },
]

// Each pair sits under one comparison.
export const inMode = (t: ABTrack, m: Mode) => t.mode === m

// Only comparisons that have pairs are offered.
export const ACTIVE_MODES = MODES.filter(m => AB_TRACKS.some(t => inMode(t, m.mode)))

// The waveform to draw: with level match on, the louder version's bars shrink by the same
// gain the player applies, so what you see matches what you hear.
export const shownPeaks = (t: ABTrack, v: Version, match: boolean) => {
  const gap = t.lufs.after - t.lufs.before
  const louder: Version = gap > 0 ? 'after' : 'before'
  if (!match || v !== louder) return t.peaks[v]
  const trim = Math.pow(10, -Math.abs(gap) / 20)
  return t.peaks[v].map(p => p * trim)
}

export const fmt = (s: number) => (isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')

export const useAB = (list: ABTrack[]) => useABEngine(list)

export type AB = ReturnType<typeof useAB>
