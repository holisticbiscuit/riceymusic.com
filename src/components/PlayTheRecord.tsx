import { useEffect, useRef, useState } from 'react'
import { init, subscribe, toggle, type RecordState } from '../lib/recordPlayer'
import { cn } from '../lib/utils'

// The hero invitation. Deliberately typographic rather than a media player:
// the full player lives in the release section. Both drive the same element.
export function PlayTheRecord({ src, className }: { src: string; className?: string }) {
  const barRef = useRef<HTMLSpanElement>(null)
  const [s, setS] = useState<RecordState>({
    playing: false,
    time: 0,
    duration: 0,
    ready: false,
    failed: false,
    volume: 0.8,
    muted: false,
  })

  useEffect(() => {
    init(src)
    return subscribe(setS)
  }, [src])

  // Level bar reads the published CSS variable rather than React state, so it
  // can run at frame rate without re-rendering anything.
  useEffect(() => {
    if (!s.playing) return
    let raf = 0
    const root = document.documentElement
    const loop = () => {
      const v = parseFloat(getComputedStyle(root).getPropertyValue('--a-rms')) || 0
      if (barRef.current) barRef.current.style.transform = `scaleX(${0.12 + v * 0.88})`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [s.playing])

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={s.playing}
      className={cn(
        'group inline-flex items-center gap-3.5 font-mono text-[0.7rem] uppercase tracking-[0.28em] text-white/70 transition-colors duration-500 hover:text-ink',
        className,
      )}
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        <span
          className={cn(
            'absolute inset-0 rounded-full border transition-colors duration-500',
            s.playing ? 'border-[var(--color-ember)]' : 'border-white/35 group-hover:border-white/70',
          )}
        />
        {s.playing ? (
          <span className="flex items-center gap-[2px]" aria-hidden>
            <i className="block h-2 w-[2px] bg-[var(--color-ember)]" />
            <i className="block h-2 w-[2px] bg-[var(--color-ember)]" />
          </span>
        ) : (
          <span
            aria-hidden
            className="ml-[2px] block h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-current"
          />
        )}
      </span>

      <span className="flex flex-col items-start gap-1.5">
        <span>{s.failed ? 'Unavailable' : s.playing ? 'Playing Years' : 'Play the record'}</span>
        <span className="block h-px w-24 overflow-hidden bg-white/15">
          <span
            ref={barRef}
            className="block h-full w-full origin-left bg-[var(--color-ember)] transition-opacity duration-500"
            style={{ transform: 'scaleX(0)', opacity: s.playing ? 1 : 0 }}
          />
        </span>
      </span>
    </button>
  )
}
