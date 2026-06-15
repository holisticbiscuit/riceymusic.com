import { useEffect, useRef, useState } from 'react'

type Track = { name: string; title: string; artist: string; before: string; after: string }

const TRACKS: Track[] = [
  { name: 'Track 1', title: 'Glass Skin', artist: 'Leon Yara', before: '/audio/Track 1 - Before.mp3', after: '/audio/Track 1 - After.mp3' },
  { name: 'Track 2', title: 'On My Mind', artist: 'Leon Yara', before: '/audio/Track 2 - Before.mp3', after: '/audio/Track 2 - After.mp3' },
]

// Before/After mastering comparison player with a real Web-Audio waveform.
// Ported from the vanilla site; logic lives in one mount effect over refs.
export function AudioPlayer() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [trackIndex, setTrackIndex] = useState(0)
  const [version, setVersion] = useState<'before' | 'after'>('before')
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState('0:00 / 0:00')
  const [info, setInfo] = useState({ title: TRACKS[0].title, artist: TRACKS[0].artist })
  const [vol, setVol] = useState(0.8)

  // mutable engine kept out of React state
  const eng = useRef<{
    before: HTMLAudioElement
    after: HTMLAudioElement
    cache: Record<string, number[]>
    peaks: number[] | null
    hover: number | null
    armed: boolean
    seq: number
  } | null>(null)

  useEffect(() => {
    const before = new Audio()
    const after = new Audio()
    before.preload = 'metadata'
    after.preload = 'metadata'
    before.volume = after.volume = 0.8
    const e = { before, after, cache: {} as Record<string, number[]>, peaks: null as number[] | null, hover: null as number | null, armed: false, seq: 0 }
    eng.current = e
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let ver: 'before' | 'after' = 'before'
    let idx = 0
    let isPlaying = false
    let raf = 0

    const active = () => (ver === 'before' ? before : after)

    function resize() {
      const r = canvas.getBoundingClientRect()
      canvas.width = r.width * devicePixelRatio
      canvas.height = r.height * devicePixelRatio
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }

    function draw(progress: number) {
      const w = canvas.getBoundingClientRect().width
      const h = canvas.getBoundingClientRect().height
      ctx.clearRect(0, 0, w, h)
      const peaks = e.peaks
      if (!peaks) return
      const bw = 3, gap = 2, total = peaks.length
      const played = Math.floor(progress * total)
      const hoverBars = e.hover === null ? -1 : Math.floor(e.hover * total)
      const cy = h / 2
      for (let i = 0; i < total; i++) {
        const x = i * (bw + gap)
        const bh = Math.max(2, peaks[i] * (h - 4))
        ctx.fillStyle = i < played ? '#f4f1ec' : i < hoverBars ? 'rgba(244,241,236,0.35)' : 'rgba(244,241,236,0.18)'
        ctx.beginPath()
        ctx.roundRect(x, cy - bh / 2, bw, bh, 1)
        ctx.fill()
      }
    }

    function placeholder(n: number) {
      const p: number[] = []
      for (let i = 0; i < n; i++) {
        const t = i / n
        const env = 0.3 + 0.25 * Math.sin(t * Math.PI) + 0.15 * Math.sin(t * 6.28 * 3) + 0.1 * Math.sin(t * 6.28 * 7 + 1)
        p.push(Math.min(1, Math.max(0.08, env)))
      }
      return p
    }

    async function peaksFor(src: string) {
      if (e.cache[src]) return e.cache[src]
      const rect = canvas.getBoundingClientRect()
      const n = Math.max(8, Math.floor(rect.width / 5))
      if (!e.armed) return placeholder(n)
      let ac: AudioContext | null = null
      try {
        ac = new (window.AudioContext || (window as any).webkitAudioContext)()
        const buf = await fetch(src).then((r) => r.arrayBuffer())
        const audio = await ac.decodeAudioData(buf)
        const ch = audio.getChannelData(0)
        const per = Math.floor(ch.length / n)
        const peaks: number[] = []
        for (let i = 0; i < n; i++) {
          let max = 0
          for (let j = i * per; j < (i + 1) * per && j < ch.length; j++) max = Math.max(max, Math.abs(ch[j]))
          peaks.push(max)
        }
        e.cache[src] = peaks
        return peaks
      } catch {
        const p = placeholder(n)
        e.cache[src] = p
        return p
      } finally {
        ac?.close().catch(() => {})
      }
    }

    async function loadWave() {
      const seq = ++e.seq
      resize()
      const src = ver === 'before' ? TRACKS[idx].before : TRACKS[idx].after
      const peaks = await peaksFor(src)
      if (seq !== e.seq) return
      e.peaks = peaks
      draw(0)
    }

    function fmt(s: number) {
      if (!s || isNaN(s)) return '0:00'
      return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
    }
    function progress() {
      const a = active()
      return a.duration ? a.currentTime / a.duration : 0
    }
    function tick() {
      draw(progress())
      const a = active()
      setTime(`${fmt(a.currentTime)} / ${fmt(a.duration)}`)
    }

    function loadTrack(i: number) {
      before.pause(); after.pause(); isPlaying = false; setPlaying(false)
      idx = i
      before.src = TRACKS[i].before
      after.src = TRACKS[i].after
      setInfo({ title: TRACKS[i].title, artist: TRACKS[i].artist })
      setTime('0:00 / 0:00')
      loadWave()
    }
    loadTrack(0)

    function arm() {
      if (e.armed) return
      e.armed = true
      loadWave().then(tick)
    }
    let io: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { arm(); io?.disconnect() } }, { rootMargin: '40% 0px' })
      io.observe(rootRef.current!)
    } else arm()

    const onTime = () => tick()
    before.addEventListener('timeupdate', () => ver === 'before' && onTime())
    after.addEventListener('timeupdate', () => ver === 'after' && onTime())
    const onEnded = () => { isPlaying = false; setPlaying(false); before.currentTime = 0; after.currentTime = 0; draw(0); tick() }
    before.addEventListener('ended', onEnded)
    after.addEventListener('ended', onEnded)
    before.addEventListener('error', () => {})
    after.addEventListener('error', () => {})

    // expose imperative handlers to React via dataset-less closures
    ;(canvas as any).__seek = (clientX: number) => {
      const a = active(); if (!a.duration) return
      const r = canvas.getBoundingClientRect()
      const t = ((clientX - r.left) / r.width) * a.duration
      before.currentTime = t; after.currentTime = t; tick()
    }
    const onMove = (ev: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      e.hover = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width))
      cancelAnimationFrame(raf); raf = requestAnimationFrame(() => draw(progress()))
    }
    const onLeave = () => { e.hover = null; draw(progress()) }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    const onResize = () => { e.cache = {}; loadWave().then(tick) }
    window.addEventListener('resize', onResize)

    // store control fns on the root for the JSX handlers
    const api = {
      toggle(v: 'before' | 'after') {
        if (v === ver) return
        const t = active().currentTime, was = isPlaying
        active().pause()
        ver = v; setVersion(v)
        active().currentTime = t
        if (was) active().play().catch(() => { isPlaying = false; setPlaying(false) })
        loadWave().then(tick)
      },
      selectTrack(i: number) { if (i !== idx) { loadTrack(i); setTrackIndex(i) } },
      play() {
        arm()
        const a = active()
        if (isPlaying) { a.pause(); isPlaying = false; setPlaying(false) }
        else a.play().then(() => { isPlaying = true; setPlaying(true) }).catch((err) => { if (err?.name !== 'AbortError') console.warn('audio play failed', err) })
      },
      volume(x: number) { before.volume = after.volume = x },
    }
    ;(rootRef.current as any).__api = api

    return () => {
      before.pause(); after.pause()
      cancelAnimationFrame(raf)
      io?.disconnect()
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const api = () => (rootRef.current as any)?.__api

  return (
    <div ref={rootRef} className="rounded-xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
      {/* track selector */}
      <div className="mb-4 flex gap-2">
        {TRACKS.map((t, i) => (
          <button
            key={t.name}
            onClick={() => api()?.selectTrack(i)}
            className={`rounded border px-4 py-1.5 text-sm transition-colors ${i === trackIndex ? 'border-white/30 bg-white/[0.08] text-ink' : 'border-white/10 text-white/55 hover:text-white/80'}`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* before / after pill */}
      <div className="relative mb-5 inline-flex overflow-hidden rounded-md" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.48),rgba(0,0,0,0.3))', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)' }}>
        <span
          className="absolute top-0 h-full w-1/2 rounded bg-ink transition-transform duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ transform: version === 'after' ? 'translateX(100%)' : 'translateX(0)' }}
        />
        {(['before', 'after'] as const).map((v) => (
          <button
            key={v}
            onClick={() => api()?.toggle(v)}
            className={`relative z-10 min-w-[100px] py-2 font-mono text-xs uppercase tracking-[0.1em] transition-colors ${version === v ? 'text-base' : 'text-white/55 hover:text-white/80'}`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* controls */}
      <div className="flex items-center gap-4">
        <button
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={() => api()?.play()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/20 text-ink transition-colors hover:border-white/60 hover:bg-white/5"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><polygon points="5,3 19,12 5,21" /></svg>
          )}
        </button>
        <canvas
          ref={canvasRef}
          height={48}
          className="h-12 min-w-0 flex-1 cursor-pointer rounded-md"
          style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.4),rgba(0,0,0,0.18))', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.55)' }}
          onClick={(e) => (canvasRef.current as any)?.__seek(e.clientX)}
        />
        <span className="flex-shrink-0 whitespace-nowrap font-mono text-xs tabular-nums text-white/60">{time}</span>
      </div>

      {/* bottom row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5 rounded-md px-3 py-2" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.35),rgba(0,0,0,0.18))', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.45)' }}>
          <span className="text-sm font-medium text-ink">{info.title}</span>
          <span className="font-mono text-[0.7rem] text-white/45">{info.artist}</span>
        </div>
        <div className="flex items-center gap-2 text-white/35">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8.5v7a4.47 4.47 0 0 0 2.5-3.5z" /></svg>
          <input
            type="range" min={0} max={1} step={0.01} value={vol}
            onChange={(e) => { const x = parseFloat(e.target.value); setVol(x); api()?.volume(x) }}
            className="h-1 w-24 cursor-pointer accent-[var(--color-ink)]"
          />
        </div>
      </div>
    </div>
  )
}
