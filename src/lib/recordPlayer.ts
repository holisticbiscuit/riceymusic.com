// ---------------------------------------------------------------------------
// One shared player for the record itself (Years).
//
// Both the hero control and the full player in the release section talk to this,
// so there is exactly one <audio> element and never two copies of the track
// playing over each other. State is broadcast to subscribers.
// ---------------------------------------------------------------------------

import { connect, ensureContext, setActive, visualsEnabled } from './audioBus'

export type RecordState = {
  playing: boolean
  time: number
  duration: number
  ready: boolean
  failed: boolean
}

// Peaks are decoded once at a fixed resolution and downsampled at draw time.
// Deriving the resolution from element width would mean re-fetching and
// re-decoding the whole file on every resize.
const PEAK_RESOLUTION = 1400

let el: HTMLAudioElement | null = null
let src = ''
let peaks: number[] | null = null
let decoding = false

const state: RecordState = { playing: false, time: 0, duration: 0, ready: false, failed: false }
const listeners = new Set<(s: RecordState) => void>()

// Subscribers get a fresh snapshot: React bails out of a setState that receives
// the same object reference, so emitting the mutable state object directly
// would update the audio and never re-render the UI.
function emit() {
  const snap = { ...state }
  for (const fn of listeners) fn(snap)
}

export function subscribe(fn: (s: RecordState) => void) {
  listeners.add(fn)
  fn({ ...state })
  return () => {
    listeners.delete(fn)
  }
}

export function getState() {
  return state
}
export function getPeaks() {
  return peaks
}

export function init(source: string) {
  src = source
  if (el) return el
  el = new Audio()
  el.src = source
  el.crossOrigin = 'anonymous'
  el.preload = 'none'
  el.loop = false

  el.addEventListener('timeupdate', () => {
    state.time = el!.currentTime
    emit()
  })
  el.addEventListener('loadedmetadata', () => {
    state.duration = el!.duration || 0
    state.ready = true
    emit()
  })
  el.addEventListener('ended', () => {
    state.playing = false
    state.time = 0
    setActive(false)
    emit()
  })
  el.addEventListener('pause', () => {
    if (!state.playing) return
    state.playing = false
    setActive(false)
    emit()
  })
  return el
}

/** Decode the waveform once. Safe to call repeatedly. */
export async function loadPeaks() {
  if (peaks || decoding || !src) return peaks
  decoding = true
  let ac: AudioContext | null = null
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ac = new Ctor()
    const buf = await fetch(src).then((r) => r.arrayBuffer())
    const audio = await ac.decodeAudioData(buf)
    const ch = audio.getChannelData(0)
    const per = Math.floor(ch.length / PEAK_RESOLUTION)
    const out: number[] = []
    let peak = 0
    for (let i = 0; i < PEAK_RESOLUTION; i++) {
      let max = 0
      for (let j = i * per; j < (i + 1) * per && j < ch.length; j++) {
        const v = Math.abs(ch[j])
        if (v > max) max = v
      }
      out.push(max)
      if (max > peak) peak = max
    }
    // Normalise so a quiet excerpt still fills the lane.
    peaks = peak > 0 ? out.map((v) => v / peak) : out
    emit()
    return peaks
  } catch {
    return null
  } finally {
    decoding = false
    ac?.close().catch(() => {})
  }
}

export async function toggle() {
  const a = el ?? init(src)
  if (!a) return
  if (state.playing) {
    a.pause()
    return
  }
  ensureContext()
  if (visualsEnabled()) connect(a)
  try {
    await a.play()
    state.playing = true
    state.failed = false
    if (visualsEnabled()) setActive(true)
    emit()
    void loadPeaks()
  } catch {
    state.failed = true
    state.playing = false
    emit()
  }
}

export function seek(ratio: number) {
  const a = el
  if (!a || !state.duration) return
  a.currentTime = Math.max(0, Math.min(1, ratio)) * state.duration
  state.time = a.currentTime
  emit()
}

export function fmt(s: number) {
  if (!isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const r = Math.floor(s % 60)
  return `${m}:${r.toString().padStart(2, '0')}`
}
