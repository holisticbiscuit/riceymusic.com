import { describe, expect, it } from 'vitest'
import { integratedLoudness, rmsBins, startOffset, truePeak } from './audioAnalysis'

const sine = (freq: number, amp: number, seconds: number, fs: number, phase = 0) =>
  Float32Array.from({ length: Math.round(seconds * fs) }, (_, n) => amp * Math.sin((2 * Math.PI * freq * n) / fs + phase))

describe('integratedLoudness', () => {
  // BS.1770 reference: a 997 Hz sine at 0 dBFS in one channel reads -3.01 LKFS.
  it('reads -3.0 LUFS for a full-scale 997 Hz sine in one channel', () => {
    for (const fs of [44100, 48000]) {
      const left = sine(997, 1, 10, fs)
      const right = new Float32Array(left.length)
      expect(integratedLoudness([left, right], fs)).toBeCloseTo(-3.0, 0)
    }
  })

  it('drops by 20 LU when the level drops by 20 dB', () => {
    const fs = 44100
    const loud = sine(997, 1, 5, fs)
    const quiet = sine(997, 0.1, 5, fs)
    expect(integratedLoudness([loud, loud], fs) - integratedLoudness([quiet, quiet], fs)).toBeCloseTo(20, 1)
  })
})

describe('truePeak', () => {
  // A quarter-rate sine sampled 45 degrees off its peaks: every sample is at 0.707, the wave
  // itself reaches 1.0 between them.
  it('finds the peak between samples', () => {
    const x = sine(44100 / 4, 1, 1, 44100, Math.PI / 4)
    expect(Math.max(...x.map(Math.abs))).toBeCloseTo(Math.SQRT1_2, 3)
    expect(truePeak([x])).toBeCloseTo(0, 0)
  })
})

describe('startOffset', () => {
  it('finds how much later the second bounce starts', () => {
    const fs = 44100
    // Bursts of noise every 300 ms, so the envelope has something to line up.
    const a = Float32Array.from({ length: fs * 4 }, (_, n) => ((n / fs) % 0.3 < 0.05 ? Math.sin(n * 1.7) : 0))
    const delay = Math.round(0.04 * fs)
    const b = new Float32Array(a.length)
    b.set(a.subarray(0, a.length - delay), delay)
    expect(startOffset(a, b, fs)).toBeCloseTo(0.04, 2)
  })
})

describe('rmsBins', () => {
  it('splits into bins and measures each', () => {
    const x = new Float32Array(1600).fill(0.5)
    const bins = rmsBins(x, 160)
    expect(bins).toHaveLength(160)
    expect(bins[0]).toBeCloseTo(0.5, 5)
  })
})
