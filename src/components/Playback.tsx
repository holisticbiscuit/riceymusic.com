import { useState } from 'react'
import { cn } from '../lib/utils'

// Shared playback pieces for the Before / After and Artist players.

export function PlayButton({ playing, onClick, label = 'Play', loading }: { playing: boolean; onClick: () => void; label?: string; loading?: boolean }) {
  return (
    <button
      type="button"
      aria-label={loading ? 'Loading' : playing ? 'Pause' : label}
      aria-busy={loading || undefined}
      disabled={loading}
      onClick={onClick}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-black transition-transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-70"
    >
      {loading ? (
        <span className="block h-5 w-5 animate-spin rounded-full border-2 border-black/25 border-t-black" />
      ) : playing ? (
        <span className="flex gap-1"><i className="block h-4 w-1 bg-current" /><i className="block h-4 w-1 bg-current" /></span>
      ) : (
        <span className="ml-1 block h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-current" />
      )}
    </button>
  )
}

// Bar waveform from precomputed RMS data, with progress and click-to-seek. On phones every
// other bar is dropped so the bars stay legible.
export function Wave({ data, progress, onSeek, height = 56, className }: { data: number[]; progress: number; onSeek: (ratio: number) => void; height?: number; className?: string }) {
  return (
    <div
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={0}
      className={cn('flex w-full min-w-0 cursor-pointer items-center gap-px sm:gap-[2px]', className)}
      style={{ height }}
      onClick={e => {
        const r = e.currentTarget.getBoundingClientRect()
        onSeek((e.clientX - r.left) / r.width)
      }}
      onKeyDown={e => {
        if (e.key === 'ArrowRight') onSeek(progress + 0.05)
        if (e.key === 'ArrowLeft') onSeek(progress - 0.05)
      }}
    >
      {data.map((v, i) => (
        <span
          key={i}
          className={cn('min-w-0 flex-1 rounded-full transition-[height,background-color] duration-300', i % 2 === 1 && 'max-sm:hidden', i / data.length < progress ? 'bg-ink' : 'bg-white/25')}
          style={{ height: `${Math.max(6, Math.sqrt(v) * 100)}%` }}
        />
      ))}
    </div>
  )
}

// Volume: a speaker that mutes and unmutes, and a slider. The slider fills up to the level.
export function Volume({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
  const [before, setBefore] = useState(0.8)
  const muted = value === 0
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        aria-label={muted ? 'Unmute' : 'Mute'}
        onClick={() => {
          if (muted) onChange(before || 0.8)
          else {
            setBefore(value)
            onChange(0)
          }
        }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
          {muted ? (
            <path d="M16 9.5l5 5M21 9.5l-5 5" />
          ) : (
            <>
              <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
              {value > 0.5 && <path d="M18.3 6.8a7.5 7.5 0 0 1 0 10.4" />}
            </>
          )}
        </svg>
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        aria-label="Volume"
        onChange={e => onChange(Number(e.target.value))}
        className="range h-11 w-24 cursor-pointer sm:w-28"
        style={{ ['--fill' as string]: `${value * 100}%` }}
      />
    </div>
  )
}
