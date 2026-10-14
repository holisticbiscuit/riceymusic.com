// Measurements for the admin's Before / After upload, matching what scripts/ab-encode.mjs gets
// from ffmpeg: integrated loudness (EBU R128 / ITU-R BS.1770), true peak, how far apart two
// bounces start, and the waveform the player draws.

type Biquad = { b: [number, number, number]; a: [number, number] }

// K-weighting for any sample rate: the BS.1770 high shelf then high pass, designed from their
// analog prototypes (as pyloudnorm does), so 44.1 kHz files measure the same as 48 kHz ones.
function kWeighting(fs: number): Biquad[] {
  const shelf = (() => {
    const G = 3.999843853973347, Q = 0.7071752369554196, fc = 1681.974450955533
    const K = Math.tan((Math.PI * fc) / fs)
    const Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416)
    const a0 = 1 + K / Q + K * K
    return {
      b: [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0],
      a: [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0],
    } as Biquad
  })()
  const highpass = (() => {
    const Q = 0.5003270373238773, fc = 38.13547087602444
    const K = Math.tan((Math.PI * fc) / fs)
    const a0 = 1 + K / Q + K * K
    return { b: [1, -2, 1], a: [(2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0] } as Biquad
  })()
  return [shelf, highpass]
}

function filter(x: Float32Array, { b, a }: Biquad): Float32Array {
  const y = new Float32Array(x.length)
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let n = 0; n < x.length; n++) {
    const v = b[0] * x[n] + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2
    x2 = x1; x1 = x[n]; y2 = y1; y1 = v
    y[n] = v
  }
  return y
}

// Integrated loudness in LUFS: 400 ms blocks with 75% overlap, gated at -70 LUFS and then at
// 10 LU below the ungated level. Channels are summed with equal weight (stereo).
export function integratedLoudness(channels: Float32Array[], fs: number): number {
  const weighted = channels.map(ch => kWeighting(fs).reduce(filter, ch))
  const block = Math.round(0.4 * fs), hop = Math.round(0.1 * fs)
  const len = weighted[0].length
  const powers: number[] = []
  for (let start = 0; start + block <= len; start += hop) {
    let z = 0
    for (const w of weighted) {
      let s = 0
      for (let i = start; i < start + block; i++) s += w[i] * w[i]
      z += s / block
    }
    powers.push(z)
  }
  const lufs = (z: number) => -0.691 + 10 * Math.log10(z)
  const mean = (xs: number[]) => xs.reduce((p, v) => p + v, 0) / xs.length
  const abs = powers.filter(z => lufs(z) > -70)
  if (!abs.length) return -Infinity
  const rel = lufs(mean(abs)) - 10
  const gated = abs.filter(z => lufs(z) > rel)
  return Math.round(lufs(mean(gated)) * 10) / 10
}

// True peak in dBTP: the highest sample after 4x oversampling with a windowed-sinc filter,
// which catches the peaks between samples that a DAC or MP3 decoder will reconstruct.
export function truePeak(channels: Float32Array[]): number {
  const TAPS = 12 // each side
  const phases = [0.25, 0.5, 0.75].map(f => {
    const h = new Float32Array(TAPS * 2)
    for (let k = -TAPS + 1; k <= TAPS; k++) {
      const t = k - f
      const sinc = Math.sin(Math.PI * t) / (Math.PI * t)
      const win = 0.5 + 0.5 * Math.cos((Math.PI * t) / (TAPS + 1))
      h[k + TAPS - 1] = sinc * win
    }
    return h
  })
  let peak = 0
  for (const x of channels) {
    for (let n = 0; n < x.length; n++) {
      const s = Math.abs(x[n])
      if (s > peak) peak = s
    }
    for (let n = TAPS; n < x.length - TAPS; n++) {
      for (const h of phases) {
        let v = 0
        for (let j = 0; j < h.length; j++) v += h[j] * x[n + j - TAPS + 1]
        if (v > peak) peak = v
        else if (-v > peak) peak = -v
      }
    }
  }
  return Math.round(20 * Math.log10(peak || 1e-12) * 10) / 10
}

export const mono = (channels: Float32Array[]) => {
  if (channels.length === 1) return channels[0]
  const out = new Float32Array(channels[0].length)
  for (const ch of channels) for (let i = 0; i < out.length; i++) out[i] += ch[i] / channels.length
  return out
}

// How much later b starts than a, in seconds (negative: earlier), from the cross-correlation
// of their energy envelopes over the first 20 s, within half a second either way.
export function startOffset(a: Float32Array, b: Float32Array, fs: number): number {
  const hop = Math.round(fs / 172) // about 5.8 ms
  const env = (x: Float32Array) => {
    const n = Math.floor(Math.min(x.length, fs * 20) / hop)
    const e = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      let s = 0
      for (let j = 0; j < hop; j++) s += x[i * hop + j] ** 2
      e[i] = Math.sqrt(s / hop)
    }
    const m = e.reduce((p, v) => p + v, 0) / n
    return e.map(v => v - m)
  }
  const ea = env(a), eb = env(b)
  const max = Math.round((0.5 * fs) / hop)
  let best = -Infinity, bestLag = 0
  for (let lag = -max; lag <= max; lag++) {
    let s = 0
    for (let i = 0; i < ea.length; i++) {
      const j = i + lag
      if (j >= 0 && j < eb.length) s += ea[i] * eb[j]
    }
    if (s > best) { best = s; bestLag = lag }
  }
  return (bestLag * hop) / fs
}

// The waveform: RMS of each of `bins` equal slices.
export function rmsBins(x: Float32Array, bins = 160): number[] {
  const size = x.length / bins
  return Array.from({ length: bins }, (_, i) => {
    const a = Math.floor(i * size), b = Math.floor((i + 1) * size)
    let s = 0
    for (let j = a; j < b; j++) s += x[j] * x[j]
    return Math.sqrt(s / Math.max(1, b - a))
  })
}
