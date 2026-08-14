import { useEffect, useRef, useState } from 'react'
import { connect, ensureContext, setActive, visualsEnabled } from '../lib/audioBus'
import { cn } from '../lib/utils'

// The control that turns the page from silent to sounding.
// Deliberately typographic: a mono label and a level bar, not a media player.
// Nothing is fetched until it is clicked.
export function PlayTheRecord({ src, className }: { src: string; className?: string }) {
  const elRef = useRef<HTMLAudioElement | null>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(true)

  useEffect(() => {
    return () => {
      setActive(false)
      elRef.current?.pause()
    }
  }, [])

  // Level bar reads the published variable rather than subscribing to state.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const root = document.documentElement
    const loop = () => {
      const v = parseFloat(getComputedStyle(root).getPropertyValue('--a-rms')) || 0
      if (barRef.current) barRef.current.style.transform = `scaleX(${0.12 + v * 0.88})`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const toggle = async () => {
    let el = elRef.current
    if (!el) {
      el = new Audio()
      el.src = src
      el.crossOrigin = 'anonymous'
      el.preload = 'none'
      el.loop = true
      el.addEventListener('ended', () => setPlaying(false))
      elRef.current = el
    }

    if (playing) {
      el.pause()
      setActive(false)
      setPlaying(false)
      return
    }

    // Context and resume must happen inside the gesture.
    ensureContext()
    if (visualsEnabled()) connect(el)

    try {
      await el.play()
      setPlaying(true)
      if (visualsEnabled()) setActive(true)
    } catch {
      // Autoplay refusal or a decode failure. Leave the page exactly as it was.
      setReady(false)
      setPlaying(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={playing}
      className={cn(
        'group inline-flex items-center gap-3.5 font-mono text-[0.7rem] uppercase tracking-[0.28em] text-white/70 transition-colors duration-500 hover:text-ink',
        className,
      )}
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        <span
          className={cn(
            'absolute inset-0 rounded-full border transition-colors duration-500',
            playing ? 'border-[var(--color-ember)]' : 'border-white/35 group-hover:border-white/70',
          )}
        />
        {playing ? (
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
        <span>{!ready ? 'Unavailable' : playing ? 'Playing Years' : 'Play the record'}</span>
        <span className="block h-px w-24 overflow-hidden bg-white/15">
          <span
            ref={barRef}
            className="block h-full w-full origin-left bg-[var(--color-ember)] transition-opacity duration-500"
            style={{ transform: 'scaleX(0)', opacity: playing ? 1 : 0 }}
          />
        </span>
      </span>
    </button>
  )
}
