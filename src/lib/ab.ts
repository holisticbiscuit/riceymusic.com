import { useCallback, useEffect, useRef, useState } from 'react'
import abTracks from '../data/ab-tracks.json'
import { SEED } from './credits'

export type Version = 'before' | 'after'

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

// Both versions play together and stay in sync; the one you hear is unmuted, so switching is
// instant and keeps your place. Level match turns the louder version down by the measured
// LUFS gap, so the master is judged on tone and punch rather than loudness alone.
export function useAB(list: ABTrack[]) {
  const [idx, setIdx] = useState(0)
  const [version, setVersion] = useState<Version>('before')
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [match, setMatch] = useState(false)
  const els = useRef<Record<Version, HTMLAudioElement> | null>(null)
  const track = list[Math.min(idx, list.length - 1)]

  useEffect(() => {
    const before = new Audio(track.src.before)
    const after = new Audio(track.src.after)
    before.preload = after.preload = 'auto'
    els.current = { before, after }
    const onTime = () => setTime(before.currentTime)
    const onMeta = () => setDur(before.duration)
    const onEnd = () => setPlaying(false)
    before.addEventListener('timeupdate', onTime)
    before.addEventListener('loadedmetadata', onMeta)
    before.addEventListener('ended', onEnd)
    return () => {
      before.pause()
      after.pause()
      before.removeEventListener('timeupdate', onTime)
      before.removeEventListener('loadedmetadata', onMeta)
      before.removeEventListener('ended', onEnd)
      els.current = null
    }
  }, [track])

  useEffect(() => {
    const e = els.current
    if (!e) return
    const gap = track.lufs.after - track.lufs.before
    const trim = match ? Math.pow(10, -Math.abs(gap) / 20) : 1
    e.before.volume = gap < 0 ? trim : 1
    e.after.volume = gap > 0 ? trim : 1
    e.before.muted = version !== 'before'
    e.after.muted = version !== 'after'
  }, [version, match, track, playing])

  const play = useCallback(async () => {
    const e = els.current
    if (!e) return
    if (!e.before.paused) {
      e.before.pause()
      e.after.pause()
      setPlaying(false)
      return
    }
    e.after.currentTime = e.before.currentTime
    await Promise.all([e.before.play(), e.after.play()]).catch(() => {})
    setPlaying(true)
  }, [])

  const seek = useCallback((ratio: number) => {
    const e = els.current
    if (!e || !isFinite(e.before.duration)) return
    const t = Math.max(0, Math.min(1, ratio)) * e.before.duration
    e.before.currentTime = e.after.currentTime = t
    setTime(t)
  }, [])

  // Keep the two clocks locked while playing.
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      const e = els.current
      if (e && Math.abs(e.after.currentTime - e.before.currentTime) > 0.04) e.after.currentTime = e.before.currentTime
    }, 500)
    return () => clearInterval(id)
  }, [playing])

  const select = (i: number) => {
    if (i === idx) return
    setPlaying(false)
    setTime(0)
    setDur(0)
    setIdx(i)
  }

  return { idx, track, version, setVersion, playing, play, time, dur, seek, match, setMatch, select }
}

export type AB = ReturnType<typeof useAB>
