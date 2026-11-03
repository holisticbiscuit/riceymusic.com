// The flat pieces of the Worlds page: the world's panel, the slow colour fade into it, the live
// count, and what shows when the browser can't draw 3D.
import type { ReactNode } from 'react'
import { PlayButton } from '../components/Playback'
import { RELEASE } from '../content'
import { cn } from '../lib/utils'
import type { YearsAudio } from './audio'

export const YEARS = {
  title: RELEASE.title,
  label: RELEASE.label,
  blurb: RELEASE.blurb,
  art: RELEASE.art,
  links: RELEASE.links.filter(l => l.url) as { name: string; url: string }[],
  // The world's palette, from the cover.
  red: '#e0141b',
  deep: '#2a0306',
}

export function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// Entering a world: the space around fades through its colours (navy, deep red, glow) over `ms`.
export function WorldFade({ on, ms = 2600 }: { on: boolean; ms?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 transition-opacity ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{
        opacity: on ? 1 : 0,
        transitionDuration: `${ms}ms`,
        background: 'radial-gradient(120% 90% at 60% 55%, rgba(224,20,27,0.0) 0%, rgba(120,6,12,0.35) 45%, rgba(42,3,6,0.85) 100%)',
      }}
    />
  )
}

// The panel in the Years world: the release, the player and the links. `show` fades it in after
// the colour fade.
export function YearsPanel({ audio, show, onBack, className, children }: { audio: YearsAudio; show: boolean; onBack?: () => void; className?: string; children?: ReactNode }) {
  return (
    <div className={cn('transition-all duration-[1400ms] ease-out', show ? 'translate-y-0 opacity-100 delay-[900ms]' : 'pointer-events-none translate-y-3 opacity-0', className)} aria-hidden={!show}>
      {onBack && (
        <button type="button" onClick={onBack} tabIndex={show ? 0 : -1} className="mb-6 flex min-h-11 items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-white/60 hover:text-ink">
          <span aria-hidden>&larr;</span> Back to space
        </button>
      )}
      <p className="eyebrow text-[#ff9a8f]">World · {YEARS.label}</p>
      <h2 className="mt-3 font-heading text-[clamp(3.4rem,8vw,6rem)] leading-none text-ink">{YEARS.title}</h2>
      <p className="mt-5 max-w-[42ch] text-[1.02rem] leading-relaxed text-white/75">{YEARS.blurb}</p>
      <div className="mt-7 flex items-center gap-4">
        <PlayButton playing={audio.playing} onClick={() => void audio.toggle()} label="Play Years" />
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-white/55">{audio.playing ? 'The rings are growing' : 'Press play: the planet listens'}</span>
      </div>
      <div className="mt-7 flex flex-wrap gap-2">
        {YEARS.links.map(l => (
          <a key={l.name} href={l.url} target="_blank" rel="noopener" tabIndex={show ? 0 : -1} className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-5 text-sm text-ink transition-colors hover:border-white/70">
            {l.name}
          </a>
        ))}
      </div>
      {children}
    </div>
  )
}

// How many lights are here right now, counting you.
export function HereCount({ n, where = 'in space', className }: { n: number; where?: string; className?: string }) {
  return (
    <p className={cn('flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-white/60', className)} aria-live="polite">
      <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-[#cfe0ff]/60" /><span className="relative h-2 w-2 rounded-full bg-[#cfe0ff]" /></span>
      {n} {n === 1 ? 'light' : 'lights'} {where}
    </p>
  )
}

// No 3D in this browser: the world as a still, with the release and its links.
export function NoWebGL() {
  return (
    <section className="relative flex min-h-svh items-center overflow-hidden bg-[#02040c] px-5 pt-24 sm:px-10 lg:px-20">
      <img src={YEARS.art} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 blur-sm" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_60%_55%,rgba(120,6,12,0.35)_0%,rgba(2,4,12,0.95)_80%)]" />
      <div className="relative max-w-md">
        <p className="eyebrow text-[#ff9a8f]">World · {YEARS.label}</p>
        <h1 className="mt-3 font-heading text-[clamp(3.4rem,8vw,6rem)] leading-none text-ink">{YEARS.title}</h1>
        <p className="mt-5 max-w-[42ch] text-[1.02rem] leading-relaxed text-white/75">{YEARS.blurb}</p>
        <p className="mt-5 text-sm text-white/50">This browser can’t draw the 3D space. Listen here:</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {YEARS.links.map(l => (
            <a key={l.name} href={l.url} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-5 text-sm text-ink transition-colors hover:border-white/70">
              {l.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
