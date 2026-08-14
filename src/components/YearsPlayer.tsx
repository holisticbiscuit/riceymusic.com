import { useEffect, useRef, useState } from 'react'
import { fmt, getPeaks, init, loadPeaks, seek, subscribe, toggle, type RecordState } from '../lib/recordPlayer'
import { cn } from '../lib/utils'

// The record's own player. Real decoded peaks, scrubbable, and wired to the same
// shared element as the hero control so the two can never fight.
export function YearsPlayer({ src, className }: { src: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [s, setS] = useState<RecordState>({ playing: false, time: 0, duration: 0, ready: false, failed: false })
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    init(src)
    return subscribe(setS)
  }, [src])

  // Decode the waveform when the player comes near the viewport, so the bytes
  // are not spent by someone who never scrolls this far.
  useEffect(() => {
    const node = wrapRef.current
    if (!node) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadPeaks().then(draw)
          io.disconnect()
        }
      },
      { rootMargin: '30%' },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const rect = canvas.getBoundingClientRect()
    if (canvas.width !== Math.floor(rect.width * dpr)) {
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, rect.width, rect.height)

    const data = getPeaks()
    const bars = Math.max(24, Math.floor(rect.width / 4))
    const gap = 1
    const bw = rect.width / bars - gap
    const mid = rect.height / 2
    const progress = s.duration ? s.time / s.duration : 0

    for (let i = 0; i < bars; i++) {
      // Downsample the fixed-resolution peaks to however many bars fit.
      let v: number
      if (data && data.length) {
        const from = Math.floor((i / bars) * data.length)
        const to = Math.max(from + 1, Math.floor(((i + 1) / bars) * data.length))
        let max = 0
        for (let j = from; j < to && j < data.length; j++) max = Math.max(max, data[j])
        v = max
      } else {
        // Placeholder lane before decode lands: shaped, not random, so it does
        // not flicker between frames.
        v = 0.25 + Math.sin(i * 0.35) * 0.12 + Math.sin(i * 0.11) * 0.08
      }

      const h = Math.max(2, v * (rect.height * 0.86))
      const x = i * (bw + gap)
      const played = i / bars <= progress
      const hovered = hover !== null && i / bars <= hover && i / bars > progress

      ctx.fillStyle = played
        ? 'rgba(196,30,42,0.95)'
        : hovered
          ? 'rgba(244,241,236,0.45)'
          : 'rgba(244,241,236,0.22)'
      ctx.fillRect(x, mid - h / 2, bw, h)
    }
  }

  useEffect(draw)

  useEffect(() => {
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  })

  const ratioFrom = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
  }

  return (
    <div
      ref={wrapRef}
      className={cn('rounded-xl border border-white/10 bg-black/35 p-5 backdrop-blur-sm sm:p-6', className)}
    >
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => void toggle()}
          aria-label={s.playing ? 'Pause Years' : 'Play Years'}
          className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/25 transition-colors duration-300 hover:border-ink"
        >
          {s.playing ? (
            <span className="flex items-center gap-[3px]" aria-hidden>
              <i className="block h-3.5 w-[2.5px] bg-ink" />
              <i className="block h-3.5 w-[2.5px] bg-ink" />
            </span>
          ) : (
            <span
              aria-hidden
              className="ml-[3px] block h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-[var(--color-ink)]"
            />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <span className="truncate font-mono text-[0.62rem] uppercase tracking-[0.24em] text-white/60">
              {s.failed ? 'Unavailable' : 'Years · excerpt'}
            </span>
            <span className="shrink-0 font-mono text-[0.62rem] tabular-nums text-white/50">
              {fmt(s.time)} / {fmt(s.duration)}
            </span>
          </div>

          <canvas
            ref={canvasRef}
            height={56}
            role="slider"
            tabIndex={0}
            aria-label="Seek within Years"
            aria-valuemin={0}
            aria-valuemax={Math.max(1, Math.floor(s.duration))}
            aria-valuenow={Math.floor(s.time)}
            aria-valuetext={`${fmt(s.time)} of ${fmt(s.duration)}`}
            onClick={(e) => seek(ratioFrom(e))}
            onMouseMove={(e) => setHover(ratioFrom(e))}
            onMouseLeave={() => setHover(null)}
            onKeyDown={(e) => {
              if (!s.duration) return
              if (e.key === 'ArrowRight') { e.preventDefault(); seek((s.time + 5) / s.duration) }
              if (e.key === 'ArrowLeft') { e.preventDefault(); seek((s.time - 5) / s.duration) }
              if (e.key === 'Home') { e.preventDefault(); seek(0) }
              if (e.key === 'End') { e.preventDefault(); seek(0.999) }
              if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); void toggle() }
            }}
            className="h-14 w-full cursor-pointer rounded"
          />
        </div>
      </div>
    </div>
  )
}
