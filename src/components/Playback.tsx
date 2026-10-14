import { cn } from '../lib/utils'

// Shared playback pieces for the Before / After and Artist players.

export function PlayButton({ playing, onClick, label = 'Play' }: { playing: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={playing ? 'Pause' : label}
      onClick={onClick}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-black transition-transform hover:scale-105 active:scale-95"
    >
      {playing ? (
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
          className={cn('min-w-0 flex-1 rounded-full transition-colors', i % 2 === 1 && 'max-sm:hidden', i / data.length < progress ? 'bg-ink' : 'bg-white/25')}
          style={{ height: `${Math.max(6, Math.sqrt(v) * 100)}%` }}
        />
      ))}
    </div>
  )
}
