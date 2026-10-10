import { PageShell } from '../components/PageShell'
import { Pill } from '../components/Pill'
import { YearsPlayer } from '../components/YearsPlayer'
import { PLAYLIST, RELEASE, SUPPORT } from '../content'

const EXCERPT = '/audio/years-excerpt.mp3'

function Subhead({ children }: { children: string }) {
  return <h2 className="mb-8 font-display text-[clamp(2rem,5vw,3rem)] leading-none text-ink">{children}</h2>
}

export default function Artist() {
  const links = RELEASE.links.filter(l => l.url)
  return (
    <PageShell eyebrow={`${RELEASE.label} · ${RELEASE.year} · ${RELEASE.format}`} title={RELEASE.title}>
      <section className="grid items-start gap-12 md:grid-cols-[320px_1fr]">
        <img src={RELEASE.art} alt={`${RELEASE.title} cover art`} className="mx-auto aspect-square w-full max-w-[320px] object-cover shadow-[0_30px_90px_-30px_rgba(11,77,232,0.6)]" />
        <div>
          <p className="max-w-md text-[1.05rem] leading-[1.85] text-white/80">{RELEASE.blurb}</p>
          <YearsPlayer src={EXCERPT} className="mt-8" />
          <div className="mt-10 border-t border-white/[0.14]">
            {links.map(l => (
              <a
                key={l.name}
                href={l.url}
                target="_blank"
                rel="noopener"
                className="group flex items-center justify-between border-b border-white/[0.1] py-4 transition-colors hover:border-white/30"
              >
                <span className="font-display text-lg text-ink">{l.name}</span>
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-white/50 transition-transform duration-500 group-hover:translate-x-1 group-hover:text-ink">
                  Play &rarr;
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {SUPPORT.length > 0 && (
        <section className="mt-28">
          <Subhead>Support</Subhead>
          <div className="space-y-16">
            {SUPPORT.map(s => (
              <figure key={s.source} className="grid items-center gap-10 md:grid-cols-[240px_1fr]">
                {s.youtubeId && (
                  <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-xl border border-white/10 bg-black/40">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${s.youtubeId}`}
                      title={`${s.source} ${s.context}`}
                      loading="lazy"
                      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="aspect-[9/16] w-full"
                      style={{ border: 0 }}
                    />
                  </div>
                )}
                <figcaption>
                  <p className="eyebrow mb-4 text-scarf-text">{s.context}</p>
                  <p className="font-display text-[clamp(2rem,5vw,3.25rem)] leading-none text-ink">{s.source}</p>
                  {s.quote && <blockquote className="mt-6 max-w-md font-serif text-[1.35rem] italic leading-snug text-white/85">&ldquo;{s.quote}&rdquo;</blockquote>}
                  {s.url && <Pill href={s.url} className="mt-8">Watch</Pill>}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {PLAYLIST.url && (
        <section className="mt-28">
          <Subhead>{PLAYLIST.title}</Subhead>
          <p className="mb-10 max-w-xl text-[1.1rem] leading-relaxed text-white/75">What is being played, and what is being built from.</p>
          {PLAYLIST.embedId && (
            <div className="mb-10 max-w-2xl overflow-hidden rounded-xl">
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
          )}
          <Pill href={PLAYLIST.url} solid>Open in Spotify</Pill>
        </section>
      )}
    </PageShell>
  )
}
