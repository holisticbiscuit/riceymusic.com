import { useEffect, useRef, useState } from 'react'
import { PageShell } from '../components/PageShell'
import { Pill } from '../components/Pill'
import { Light } from '../components/Light'
import { PlayButton, Wave } from '../components/Playback'
import { PLAYLIST, RELEASE, SUPPORT } from '../content'
import { SEED } from '../lib/credits'
import { fmt } from '../lib/ab'
import yearsPeaks from '../data/years-peaks.json'

const EXCERPT = '/audio/years-excerpt.mp3'

// Releases Ricey wrote or produced, newest first.
const PRODUCTIONS = SEED.filter(c => c.roles.includes('Composer') || c.roles.includes('Producer'))

function YearsExcerpt({ className }: { className?: string }) {
  const el = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [d, setD] = useState(0)
  useEffect(() => {
    const a = new Audio(EXCERPT)
    a.preload = 'metadata'
    el.current = a
    const tu = () => setT(a.currentTime)
    const lm = () => setD(a.duration)
    const en = () => setPlaying(false)
    a.addEventListener('timeupdate', tu)
    a.addEventListener('loadedmetadata', lm)
    a.addEventListener('ended', en)
    return () => {
      a.pause()
      a.removeEventListener('timeupdate', tu)
      a.removeEventListener('loadedmetadata', lm)
      a.removeEventListener('ended', en)
    }
  }, [])
  const toggle = () => {
    const a = el.current
    if (!a) return
    if (a.paused) {
      void a.play()
      setPlaying(true)
    } else {
      a.pause()
      setPlaying(false)
    }
  }
  const seek = (ratio: number) => {
    const a = el.current
    if (a && isFinite(a.duration)) a.currentTime = Math.max(0, Math.min(1, ratio)) * a.duration
  }
  return (
    <div className={`flex items-center gap-4 ${className ?? ''}`}>
      <PlayButton playing={playing} onClick={toggle} label="Play Years" />
      <Wave data={yearsPeaks as number[]} progress={d ? t / d : 0} onSeek={seek} height={48} />
      <span className="shrink-0 font-mono text-xs tabular-nums text-white/55">{fmt(t)} / {fmt(d)}</span>
    </div>
  )
}

export default function Artist() {
  return (
    <PageShell title="Artist">
      <Light height={1300} />
      <div className="relative">
        <section className="grid items-center gap-10 md:grid-cols-2">
          <div className="glass rounded-[2rem] p-2">
            <div className="relative overflow-hidden rounded-3xl bg-black">
              <img src="/images/portrait-tee.webp" alt="Ricey" className="aspect-[4/5] w-full object-cover object-[50%_30%]" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black to-transparent" />
            </div>
          </div>
          <div>
            <h2 className="font-heading text-[clamp(2.4rem,4.5vw,3.6rem)] leading-[1.05] text-ink">
              Dark, immersive progressive house, made between thought and feeling.
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-white/65">
              Techno and progressive artist and audio engineer. Debut single Years out now on {RELEASE.label}.
            </p>
          </div>
        </section>

        <section className="glass mt-24 grid gap-8 rounded-3xl p-6 sm:p-9 md:grid-cols-[260px_minmax(0,1fr)] md:items-center">
          <img src={RELEASE.art} alt="Years cover art" className="aspect-square w-full max-w-[260px] rounded-2xl object-cover" />
          <div className="min-w-0">
            <p className="eyebrow text-scarf-text">Latest release</p>
            <h2 className="mt-3 font-heading text-[3rem] leading-none text-ink">{RELEASE.title}</h2>
            <p className="mt-4 max-w-lg text-white/70">{RELEASE.blurb}</p>
            <YearsExcerpt className="mt-7" />
            <div className="mt-6 flex flex-wrap gap-2">
              {RELEASE.links.filter(l => l.url).map(l => (
                <a key={l.name} href={l.url} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm text-ink transition-colors hover:border-white/60">
                  {l.name}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-24">
          <h2 className="mb-8 font-heading text-[2.4rem] leading-none text-ink">Written &amp; produced</h2>
          <div className="flex gap-4 overflow-x-auto pb-3">
            {PRODUCTIONS.map(p => {
              const body = (
                <>
                  <img src={p.art} alt={`${p.title} by ${p.artist}`} className="aspect-square w-full rounded-xl object-cover" />
                  <span className="mt-3 block truncate font-heading text-[1.15rem] text-ink">{p.title}</span>
                  <span className="block truncate text-sm text-white/50">{p.artist}</span>
                </>
              )
              return p.url ? (
                <a key={p.id} href={p.url} target="_blank" rel="noopener" className="w-44 shrink-0">{body}</a>
              ) : (
                <div key={p.id} className="w-44 shrink-0">{body}</div>
              )
            })}
          </div>
        </section>

        {SUPPORT.length > 0 && (
          <section className="glass mt-24 rounded-3xl p-6 sm:p-9">
            <h2 className="mb-8 font-heading text-[2.4rem] leading-none text-ink">Support</h2>
            {SUPPORT.map(s => (
              <figure key={s.source} className="grid items-center gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
                {s.youtubeId && (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${s.youtubeId}`}
                      title={`${s.source} ${s.context}`}
                      loading="lazy"
                      allow="encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="aspect-[9/16] w-full"
                      style={{ border: 0 }}
                    />
                  </div>
                )}
                <figcaption>
                  <p className="eyebrow text-scarf-text">{s.context}</p>
                  <p className="mt-3 font-heading text-[clamp(2rem,4vw,3rem)] leading-none text-ink">{s.source}</p>
                  {s.url && <div className="mt-6"><Pill href={s.url}>Watch</Pill></div>}
                </figcaption>
              </figure>
            ))}
          </section>
        )}

        {PLAYLIST.url && (
          <section className="mt-24">
            <h2 className="mb-8 font-heading text-[2.4rem] leading-none text-ink">{PLAYLIST.title}</h2>
            <div className="max-w-3xl overflow-hidden rounded-2xl">
              <iframe
                src={`https://open.spotify.com/embed/playlist/${PLAYLIST.embedId}?utm_source=generator&theme=0`}
                title={PLAYLIST.title}
                width="100%"
                height={352}
                loading="lazy"
                allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                style={{ border: 0 }}
              />
            </div>
          </section>
        )}
      </div>
    </PageShell>
  )
}
