// ---------------------------------------------------------------------------
// One audio graph for the whole site.
//
// Any <audio> element on the page can be routed through here; the analyser then
// publishes three normalised scalars to CSS custom properties on <html>:
//
//   --a-low   kick / sub weight
//   --a-air   high end, brightness
//   --a-rms   overall level
//
// CSS and a couple of refs read those directly, so the visuals never touch React
// state and nothing re-renders per frame.
//
// Deliberately a plain module singleton, not a context or a hook.
// ---------------------------------------------------------------------------

type Levels = { low: number; air: number; rms: number }

const LEVELS: Levels = { low: 0, air: 0, rms: 0 }

let ctx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let bins: Uint8Array | null = null
let active = false
let registered = false

// createMediaElementSource throws if called twice for the same element, so each
// element gets exactly one source node, remembered here.
const sources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>()

// Visual modulation is desktop-only. Phones still get the sound, they just never
// run the analyser loop or the type re-rasterisation.
export function visualsEnabled() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (!window.matchMedia('(pointer: fine)').matches) return false
  return window.innerWidth >= 1024
}

function registerProps() {
  if (registered) return
  registered = true
  const anyCSS = window.CSS as unknown as { registerProperty?: (d: object) => void }
  if (!anyCSS?.registerProperty) return
  for (const name of ['--a-low', '--a-air', '--a-rms']) {
    try {
      anyCSS.registerProperty({ name, syntax: '<number>', inherits: true, initialValue: '0' })
    } catch {
      // already registered, or unsupported syntax. Substitution still works.
    }
  }
}

// Must be called from inside a user gesture: browsers refuse to start an
// AudioContext otherwise, and iOS in particular will stay suspended.
export function ensureContext(): AudioContext | null {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    // Light smoothing only: the envelope follower below does the shaping, and
    // stacking both makes the response mush into a constant glow.
    analyser.smoothingTimeConstant = 0.55
    // Default range (-100..-30 dB) pins a loud master at the top and gives no
    // movement. Widening the ceiling puts the dynamics back.
    analyser.minDecibels = -85
    analyser.maxDecibels = -12
    analyser.connect(ctx.destination)
    bins = new Uint8Array(analyser.frequencyBinCount)
    registerProps()
    void ctx.resume()
    return ctx
  } catch {
    ctx = null
    analyser = null
    return null
  }
}

/** Route a media element into the shared graph. Safe to call more than once. */
export function connect(el: HTMLMediaElement) {
  const c = ensureContext()
  if (!c || !analyser) return
  if (sources.has(el)) return
  try {
    const src = c.createMediaElementSource(el)
    src.connect(analyser)
    sources.set(el, src)
  } catch {
    // Element already bound elsewhere, or tainted by CORS. Playback is
    // untouched; only the reactive visuals are lost.
  }
}

export function setActive(on: boolean) {
  active = on
  if (!on) {
    LEVELS.low = 0
    LEVELS.air = 0
    LEVELS.rms = 0
    publish(true)
  }
}

export function getLevels(): Levels {
  return LEVELS
}

function publish(force = false) {
  const root = document.documentElement
  if (force || active) {
    root.style.setProperty('--a-low', LEVELS.low.toFixed(3))
    root.style.setProperty('--a-air', LEVELS.air.toFixed(3))
    root.style.setProperty('--a-rms', LEVELS.rms.toFixed(3))
  }
}

// Asymmetric envelope follower. Fast attack so a kick punches, slow release so
// it decays like a room. A symmetric smooth reads like a cheap VU meter.
const ATTACK = 0.45
const RELEASE = 0.13
function follow(prev: number, next: number) {
  const k = next > prev ? ATTACK : RELEASE
  return prev + (next - prev) * k
}

// Bin indices are meaningless without the sample rate: it is 48kHz on most
// machines but can be 96k or 192k, which would move a fixed index by octaves.
// Always resolve bands by frequency.
function band(hzFrom: number, hzTo: number) {
  if (!bins || !ctx || !analyser) return 0
  const nyquist = ctx.sampleRate / 2
  const n = analyser.frequencyBinCount
  const from = Math.max(1, Math.floor((hzFrom / nyquist) * n))
  const to = Math.min(n, Math.ceil((hzTo / nyquist) * n))
  if (to <= from) return 0
  let sum = 0
  for (let i = from; i < to; i++) sum += bins[i]
  return sum / (to - from) / 255
}

// Auto-ranging. A mastered track is compressed by design, so its bands sit in a
// narrow window near the top: dividing by a peak alone still yields a constant
// glow. Track a decaying ceiling AND a rising floor, then map the live value
// across whatever window the track is actually using. This is what turns a
// steady shimmer into something that moves with the music, on any track.
type Range = { lo: number; hi: number }
const env: Record<'low' | 'air' | 'rms', Range> = {
  low: { lo: 1, hi: 0 },
  air: { lo: 1, hi: 0 },
  rms: { lo: 1, hi: 0 },
}

function normalise(key: 'low' | 'air' | 'rms', v: number) {
  const e = env[key]
  // Ceiling jumps up instantly, sags back slowly.
  e.hi = v > e.hi ? v : Math.max(v, e.hi * 0.9992)
  // Floor drops instantly, creeps back up so it keeps following the passage.
  e.lo = v < e.lo ? v : Math.min(v, e.lo + (1 - e.lo) * 0.0008)
  const range = e.hi - e.lo
  if (range < 0.02) return 0
  return Math.min(1, Math.max(0, (v - e.lo) / range))
}

/**
 * Advance one frame. Driven from the existing Lenis rAF loop so the page never
 * runs a third animation loop.
 */
export function tick() {
  if (!active || !analyser || !bins) return
  analyser.getByteFrequencyData(bins as Uint8Array<ArrayBuffer>)

  // Bands by frequency, then adaptive gain, then curved: raw values sit high
  // and flat, which reads as a constant glow rather than a rhythm.
  const low = normalise('low', band(30, 140))
  const air = normalise('air', band(4000, 12000))
  const rms = normalise('rms', band(60, 8000))

  LEVELS.low = follow(LEVELS.low, low * low)
  LEVELS.air = follow(LEVELS.air, air * air)
  LEVELS.rms = follow(LEVELS.rms, rms)

  publish()
}
