// The browser version of scripts/ab-encode.mjs: two bounces in, two MP3s and their
// measurements out, ready to publish.
import { integratedLoudness, mono, rmsBins, startOffset, truePeak } from '../../lib/audioAnalysis'
import type { EncodeJob, EncodeMessage } from './mp3.worker'

const RATE = 44100
const CEILING = -1 // dBTP, the most either MP3 may peak at
type Version = 'before' | 'after'
const VERSIONS: Version[] = ['before', 'after']

export type Processed = {
  files: Record<Version, Blob>
  lufs: Record<Version, number>
  truePeak: Record<Version, number>
  peaks: Record<Version, number[]>
  duration: number
  offsetMs: number
  gainDb: number
}

export type Step = { label: string; progress?: number }

const decode = async (data: ArrayBuffer) => {
  const buf = await new OfflineAudioContext(2, 1, RATE).decodeAudioData(data)
  return Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i))
}

const encode = (channels: Float32Array[], gainDb: number, onProgress: (p: number) => void) =>
  new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
    const w = new Worker(new URL('./mp3.worker.ts', import.meta.url), { type: 'module' })
    // Copies, so the originals can be encoded again if the level needs another pass.
    const copies = channels.map(c => c.slice())
    w.onmessage = (e: MessageEvent<EncodeMessage>) => {
      if ('progress' in e.data) onProgress(e.data.progress)
      else {
        resolve(e.data.mp3)
        w.terminate()
      }
    }
    w.onerror = e => {
      reject(new Error(e.message || 'The MP3 encoder failed'))
      w.terminate()
    }
    w.postMessage({ channels: copies, sampleRate: RATE, gainDb } satisfies EncodeJob, copies.map(c => c.buffer))
  })

export async function processPair(input: Record<Version, File>, onStep: (s: Step) => void): Promise<Processed> {
  onStep({ label: 'Reading the files' })
  const raw: Record<Version, Float32Array[]> = {
    before: await decode(await input.before.arrayBuffer()).catch(() => {
      throw new Error(`Couldn't read ${input.before.name}. Use a WAV, AIFF or MP3.`)
    }),
    after: await decode(await input.after.arrayBuffer()).catch(() => {
      throw new Error(`Couldn't read ${input.after.name}. Use a WAV, AIFF or MP3.`)
    }),
  }

  onStep({ label: 'Lining them up' })
  const offset = startOffset(mono(raw.before), mono(raw.after), RATE)
  const start = { before: Math.max(0, Math.round(-offset * RATE)), after: Math.max(0, Math.round(offset * RATE)) }
  const length = Math.min(raw.before[0].length - start.before, raw.after[0].length - start.after)
  if (length < RATE * 5) throw new Error('The clips need to be at least 5 seconds long.')
  const clip = Object.fromEntries(VERSIONS.map(v => [v, raw[v].map(c => c.subarray(start[v], start[v] + length))])) as Record<Version, Float32Array[]>

  onStep({ label: 'Checking peaks' })
  // Start from the WAVs' own true peak; the MP3s are checked afterwards and a second pass
  // turns both down further if encoding pushed a peak over.
  const wavPeak = Math.max(truePeak(clip.before), truePeak(clip.after))
  let gainDb = Math.min(0, CEILING - 0.5 - wavPeak)

  for (let pass = 0; ; pass++) {
    const mp3: Partial<Record<Version, Uint8Array<ArrayBuffer>>> = {}
    const done = { before: 0, after: 0 }
    const report = () => onStep({ label: pass ? 'Encoding again, a little quieter' : 'Encoding MP3s', progress: (done.before + done.after) / 2 })
    await Promise.all(
      VERSIONS.map(async v => {
        mp3[v] = await encode(clip[v], gainDb, p => {
          done[v] = p
          report()
        })
        done[v] = 1
        report()
      }),
    )

    onStep({ label: 'Measuring' })
    const decoded = { before: await decode(mp3.before!.slice().buffer), after: await decode(mp3.after!.slice().buffer) }
    const tp = { before: truePeak(decoded.before), after: truePeak(decoded.after) }
    const over = Math.max(tp.before, tp.after) - CEILING
    if (over > 0 && pass < 3) {
      gainDb -= over + 0.1
      continue
    }

    const lufs = { before: integratedLoudness(decoded.before, RATE), after: integratedLoudness(decoded.after, RATE) }
    const bins = { before: rmsBins(mono(decoded.before)), after: rmsBins(mono(decoded.after)) }
    // Both waveforms are drawn against the louder of the pair, so the quieter one looks quieter.
    const top = Math.max(...bins.before, ...bins.after) || 1
    const peaks = { before: bins.before.map(p => Math.round((p / top) * 1000) / 1000), after: bins.after.map(p => Math.round((p / top) * 1000) / 1000) }
    const duration = Math.min(decoded.before[0].length, decoded.after[0].length) / RATE
    return {
      files: { before: new Blob([mp3.before!], { type: 'audio/mpeg' }), after: new Blob([mp3.after!], { type: 'audio/mpeg' }) },
      lufs,
      truePeak: tp,
      peaks,
      duration: Math.round(duration * 100) / 100,
      offsetMs: Math.round(offset * 1000),
      gainDb: Math.round(gainDb * 10) / 10,
    }
  }
}
