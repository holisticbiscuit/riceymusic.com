import abTracks from '../data/ab-tracks.json'
import { SEED } from './credits'
import { useABEngine, type Version } from './abEngine'

export type { Version }

export type ABTrack = {
  title: string
  artist: string
  art?: string
  roles: string[]
  src: Record<Version, string>
  lufs: Record<Version, number> // integrated loudness, measured with ffmpeg ebur128
  peaks: Record<Version, number[]> // 160 RMS bins, normalised to the louder of the pair
}

// Made by scripts/ab-encode.mjs from the before/after WAVs, keyed by release title.
const AUDIO = abTracks as Record<string, Pick<ABTrack, 'src' | 'lufs' | 'peaks'>>

// Every release with before/after audio, newest first like the Credits page.
export const AB_TRACKS: ABTrack[] = SEED.filter(c => AUDIO[c.title]).map(c => ({
  ...AUDIO[c.title],
  title: c.title,
  artist: c.artist,
  art: c.art,
  roles: c.roles,
}))

export type Mode = 'Mixing' | 'Mastering' | 'Mixing & mastering'

export const MODES: { mode: Mode; blurb: string }[] = [
  { mode: 'Mixing', blurb: 'Balance, space and punch. The raw stems against the finished mix.' },
  { mode: 'Mastering', blurb: 'Loudness, tone and translation. The finished mix against the release master.' },
  { mode: 'Mixing & mastering', blurb: 'The whole journey. The raw stems against the release-ready master.' },
]

// Each release sits in exactly one group, matching its roles on the Credits page.
export const inMode = (t: ABTrack, m: Mode) => {
  const mix = t.roles.includes('Mixing')
  const master = t.roles.includes('Mastering')
  return m === 'Mixing' ? mix && !master : m === 'Mastering' ? master && !mix : mix && master
}

// Only groups that have releases are offered; Mixing appears once a mixing-only credit exists.
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
