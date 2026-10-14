import { useMemo, useState } from 'react'
import { PageShell } from '../components/PageShell'
import { Pill } from '../components/Pill'
import { PlayButton, Volume, Wave } from '../components/Playback'
import { ACTIVE_MODES, AB_TRACKS, fmt, inMode, shownPeaks, useAB, type ABTrack, type Mode } from '../lib/ab'
import { cn } from '../lib/utils'

function Art({ track, className }: { track: ABTrack; className?: string }) {
  return track.art ? (
    <img src={track.art} alt={`${track.title} cover`} className={cn('aspect-square object-cover', className)} />
  ) : (
    <div className={cn('aspect-square bg-[radial-gradient(120%_90%_at_30%_20%,var(--color-scarf-lift),var(--color-scarf-deep)_72%)]', className)} />
  )
}

// Step 1: choose what to hear.
function Choose({ onPick }: { onPick: (m: Mode) => void }) {
  return (
    <>
      <p className="mx-auto mb-12 max-w-xl text-center text-[1.1rem] leading-relaxed text-white/70">
        Choose what you want to hear, then switch between before and after while it plays.
      </p>
      <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
        {ACTIVE_MODES.map(({ mode, blurb }) => {
          const tracks = AB_TRACKS.filter(t => inMode(t, mode))
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onPick(mode)}
              className="group flex flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-black/25 text-left transition-colors hover:border-white/25"
            >
              {tracks.length >= 3 ? (
                <span className="grid grid-cols-3">
                  {tracks.slice(0, 3).map(t => (
                    <Art key={t.title} track={t} className="w-full transition-transform duration-700 group-hover:scale-[1.03]" />
                  ))}
                </span>
              ) : (
                // Fewer than three releases: the whole cover, uncropped, on a blurred copy of itself.
                <span className="relative block aspect-[3/1] overflow-hidden">
                  {tracks[0]?.art && (
                    <>
                      <img src={tracks[0].art} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
                      <img src={tracks[0].art} alt="" className="relative mx-auto h-full w-auto shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-transform duration-700 group-hover:scale-[1.03]" />
                    </>
                  )}
                </span>
              )}
              <span className="flex flex-1 flex-col p-6">
                <span className="font-heading text-[2rem] leading-none text-ink">{mode}</span>
                <span className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-white/65">{blurb}</span>
                <span className="mt-6 flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-[0.2em] text-white/45">
                  {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
                  <span className="text-ink transition-transform group-hover:translate-x-1">Listen &rarr;</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

// Step 2: the player for one comparison, with its releases underneath.
function Player({ mode, onBack }: { mode: Mode; onBack: () => void }) {
  const list = useMemo(() => AB_TRACKS.filter(t => inMode(t, mode)), [mode])
  const ab = useAB(list)
  const progress = ab.dur ? ab.time / ab.dur : 0
  return (
    <>
      <button type="button" onClick={onBack} className="mb-6 flex min-h-11 items-center gap-2 text-sm text-white/65 hover:text-ink">
        <span aria-hidden>&larr;</span> All comparisons
      </button>

      <div className="rounded-3xl border border-white/[0.08] bg-black/25 p-5 backdrop-blur-sm sm:p-8">
        <div className="grid gap-8 md:grid-cols-[300px_minmax(0,1fr)] md:items-center">
          <Art track={ab.track} className="w-full max-w-[300px] rounded-xl shadow-[0_30px_80px_-30px_rgba(47,79,168,0.7)]" />
          <div className="min-w-0">
            <p className="eyebrow mb-4 text-scarf-text">{mode}</p>
            <h2 className="font-heading text-[clamp(2rem,4vw,3.25rem)] leading-none text-ink">{ab.track.title}</h2>
            <p className="mt-2 text-white/60">{ab.track.artist}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <PlayButton playing={ab.playing} onClick={ab.play} loading={ab.loading} />
              <div role="radiogroup" aria-label="Version" className="relative inline-flex rounded-full bg-black/40 p-1">
                <span
                  aria-hidden
                  className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-ink transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ transform: ab.version === 'after' ? 'translateX(100%)' : 'none' }}
                />
                {(['before', 'after'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={ab.version === v}
                    onClick={() => ab.setVersion(v)}
                    className={cn('relative z-10 min-h-11 min-w-[104px] rounded-full px-5 text-[0.95rem] capitalize transition-colors', ab.version === v ? 'text-black' : 'text-white/70 hover:text-ink')}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <span className="font-mono text-xs tabular-nums text-white/55">{fmt(ab.time)} / {fmt(ab.dur)}</span>
            </div>
            <Wave data={shownPeaks(ab.track, ab.version, ab.match)} progress={progress} onSeek={ab.seek} className="mt-7" />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm text-white/80">
                <span className={cn('relative h-7 w-12 rounded-full transition-colors', ab.match ? 'bg-scarf-lift' : 'bg-white/15')}>
                  <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-ink transition-transform', ab.match ? 'translate-x-6' : 'translate-x-1')} />
                </span>
                <input type="checkbox" className="sr-only" checked={ab.match} onChange={e => ab.setMatch(e.target.checked)} />
                Level match
              </label>
              <Volume value={ab.vol} onChange={ab.setVol} />
            </div>
            {ab.failed && <p className="mt-3 text-sm text-white/55">This clip didn&rsquo;t load. Check your connection and pick it again.</p>}
          </div>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((t, i) => (
          <button key={t.title} type="button" onClick={() => ab.select(i)} className={cn('text-left transition-opacity', i === ab.idx ? 'opacity-100' : 'opacity-60 hover:opacity-100')}>
            <Art track={t} className={cn('w-full rounded-lg', i === ab.idx && 'ring-2 ring-scarf-text')} />
            <span className="mt-2 block truncate text-sm text-ink">{t.title}</span>
            <span className="block truncate text-xs text-white/50">{t.artist}</span>
          </button>
        ))}
      </div>
    </>
  )
}

export default function BeforeAfter() {
  const [mode, setMode] = useState<Mode | null>(null)
  return (
    <PageShell eyebrow="Hear the difference" title="Before / After">
      {mode ? <Player mode={mode} onBack={() => setMode(null)} /> : <Choose onPick={setMode} />}

      <section className="mt-24 grid gap-8 rounded-3xl border border-white/[0.08] bg-black/20 p-6 sm:p-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p className="eyebrow text-white/50">Your track next</p>
          <p className="mt-4 max-w-xl font-heading text-[1.6rem] leading-snug text-ink">
            Send a finished mix to be mastered, or your stems to be mixed and mastered.
          </p>
          <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-white/45">Mastering from £80 per track</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Pill to="/services">Rates</Pill>
          <Pill to="/contact" solid>Send a track</Pill>
        </div>
      </section>
    </PageShell>
  )
}
