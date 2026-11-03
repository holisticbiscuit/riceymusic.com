// Years for the Worlds page: the 46 s excerpt on a loop, through an analyser (so the planet moves
// with the music), the site's remembered volume, and `near`: how close you are to the world
// (0..1), which fades the sound in as you approach. `level`, `progress` and `near` are refs, read and written
// every frame without re-rendering. `progress` counts across loops, so the planet's rings keep
// growing the longer you stay (full after RINGS_LOOPS times round).
import { useEffect, useRef, useState } from 'react'
import { useVolume } from '../lib/abEngine'

const RINGS_LOOPS = 6

export function useYearsAudio(src: string) {
  const [playing, setPlaying] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [vol, setVol] = useVolume()
  const volRef = useRef(vol)
  volRef.current = vol
  const level = useRef(0)
  const progress = useRef(0)
  const near = useRef(1)
  const parts = useRef<{ el: HTMLAudioElement; an?: AnalyserNode; gain?: GainNode; data?: Uint8Array<ArrayBuffer>; ctx?: AudioContext } | null>(null)

  useEffect(() => {
    const el = new Audio(src)
    el.preload = 'auto'
    el.loop = true
    let loops = 0
    let last = 0
    const ended = () => setPlaying(false)
    el.addEventListener('ended', ended)
    parts.current = { el }
    let raf = 0
    const tick = () => {
      const p = parts.current
      if (p?.an && p.data) {
        p.an.getByteFrequencyData(p.data)
        let s = 0
        for (let i = 0; i < 24; i++) s += p.data[i]
        level.current = level.current * 0.8 + (s / (24 * 255)) * 0.2
      } else level.current *= 0.95
      if (p?.gain && p.ctx) p.gain.gain.setTargetAtTime(volRef.current * volRef.current * near.current, p.ctx.currentTime, 0.12)
      if (p?.el.duration) {
        // A jump back to the start means it went round again.
        if (p.el.currentTime < last - 1) loops++
        last = p.el.currentTime
        progress.current = Math.min(1, (loops + p.el.currentTime / p.el.duration) / RINGS_LOOPS)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      el.pause()
      el.removeEventListener('ended', ended)
      parts.current?.ctx?.close()
      parts.current = null
    }
  }, [src])

  const graph = () => {
    const p = parts.current!
    if (!p.ctx) {
      const ctx = new AudioContext()
      const node = ctx.createMediaElementSource(p.el)
      const an = ctx.createAnalyser()
      an.fftSize = 256
      const gain = ctx.createGain()
      gain.gain.value = 0
      node.connect(an)
      an.connect(gain)
      gain.connect(ctx.destination)
      Object.assign(p, { ctx, an, gain, data: new Uint8Array(an.frequencyBinCount) })
    }
    return p
  }

  // Start if not already playing. Browsers refuse sound until the visitor has clicked, tapped or
  // pressed a key on the page; then `blocked` is set and a Sound on button is the way in.
  const start = async () => {
    if (!parts.current) return false
    const p = graph()
    if (!p.el.paused) return true
    try {
      await p.ctx!.resume()
      await p.el.play()
      setPlaying(true)
      setBlocked(false)
      return true
    } catch {
      setBlocked(true)
      return false
    }
  }
  const stop = () => {
    parts.current?.el.pause()
    setPlaying(false)
  }
  const toggle = async () => {
    if (!parts.current) return
    if (parts.current.el.paused) await start()
    else stop()
  }
  return { playing, blocked, toggle, start, stop, level, progress, near, vol, setVol }
}
export type YearsAudio = ReturnType<typeof useYearsAudio>
