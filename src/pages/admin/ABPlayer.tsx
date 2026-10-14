import { useMemo } from 'react'
import { fmt } from '../../lib/ab'
import { useABEngine, type Version } from '../../lib/abEngine'
import { cn } from '../../lib/utils'
import { PlayButton, Volume, Wave } from '../../components/Playback'

// One pair with the same controls as the site's player: play, before / after, the waveform,
// level match and volume. Used for a prepared upload and for a pair already on the site.
export function ABPlayer({ src, lufs, peaks }: { src: Record<Version, string>; lufs: Record<Version, number>; peaks: Record<Version, number[]> }) {
  const list = useMemo(() => [{ src, lufs }], [src, lufs])
  const ab = useABEngine(list)
  const gap = lufs.after - lufs.before
  const louder: Version = gap > 0 ? 'after' : 'before'
  const trim = ab.match ? Math.pow(10, -Math.abs(gap) / 20) : 1
  const data = peaks[ab.version].map(p => (ab.version === louder ? p * trim : p))
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <PlayButton playing={ab.playing} onClick={ab.play} loading={ab.loading} />
        <div role="radiogroup" aria-label="Version" className="inline-flex rounded-full bg-black/40 p-1">
          {(['before', 'after'] as const).map(v => (
            <button key={v} type="button" role="radio" aria-checked={ab.version === v} onClick={() => ab.setVersion(v)} className={cn('min-h-11 min-w-[88px] rounded-full px-5 text-sm capitalize transition-colors', ab.version === v ? 'bg-ink text-black' : 'text-white/70 hover:text-ink')}>
              {v}
            </button>
          ))}
        </div>
        <span className="font-mono text-xs tabular-nums text-white/55">{fmt(ab.time)} / {fmt(ab.dur)}</span>
      </div>
      <Wave data={data} progress={ab.dur ? ab.time / ab.dur : 0} onSeek={ab.seek} className="mt-6" />
      {ab.failed && <p className="mt-3 text-sm text-white/55">The clips didn&rsquo;t load. If you just published, the site may still be updating.</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-white/80">
          <input type="checkbox" checked={ab.match} onChange={e => ab.setMatch(e.target.checked)} className="h-4 w-4 accent-ink" />
          Level match
        </label>
        <Volume value={ab.vol} onChange={ab.setVol} />
      </div>
    </div>
  )
}
