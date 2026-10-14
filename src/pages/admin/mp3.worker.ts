/// <reference lib="webworker" />
// Encodes one clip to a 192 kbps MP3 off the main thread, so the admin page stays responsive.
import { Mp3Encoder } from '@breezystack/lamejs'

export type EncodeJob = { channels: Float32Array[]; sampleRate: number; gainDb: number }
export type EncodeMessage = { progress: number } | { mp3: Uint8Array<ArrayBuffer> }

const FRAME = 1152

self.onmessage = (e: MessageEvent<EncodeJob>) => {
  const { channels, sampleRate, gainDb } = e.data
  const gain = Math.pow(10, gainDb / 20)
  const stereo = channels.length > 1
  const enc = new Mp3Encoder(stereo ? 2 : 1, sampleRate, 192)
  const len = channels[0].length
  const parts: Uint8Array[] = []
  const toInt16 = (x: Float32Array, a: number, b: number) => {
    const out = new Int16Array(b - a)
    for (let i = a; i < b; i++) {
      const v = Math.max(-1, Math.min(1, x[i] * gain))
      out[i - a] = v < 0 ? v * 0x8000 : v * 0x7fff
    }
    return out
  }
  let lastReport = 0
  for (let i = 0; i < len; i += FRAME) {
    const end = Math.min(len, i + FRAME)
    const chunk = stereo ? enc.encodeBuffer(toInt16(channels[0], i, end), toInt16(channels[1], i, end)) : enc.encodeBuffer(toInt16(channels[0], i, end))
    if (chunk.length) parts.push(chunk)
    if (i - lastReport > sampleRate * 2) {
      lastReport = i
      self.postMessage({ progress: i / len } satisfies EncodeMessage)
    }
  }
  const tail = enc.flush()
  if (tail.length) parts.push(tail)
  const mp3 = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    mp3.set(p, o)
    o += p.length
  }
  self.postMessage({ mp3 } satisfies EncodeMessage, [mp3.buffer])
}
