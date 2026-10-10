import { PageShell } from '../components/PageShell'
import { EMAIL, INSTAGRAM, SOUNDCLOUD, SPOTIFY_TRACK } from '../content'

export default function Contact() {
  const channels: [string, string, string][] = [
    ['Instagram', '@riceymusic', INSTAGRAM],
    ['SoundCloud', 'riceymusic', SOUNDCLOUD],
    ['Spotify', 'Ricey', SPOTIFY_TRACK],
  ]
  return (
    <PageShell eyebrow="Get in touch" title="Contact">
      <div className="text-center">
        <p className="mx-auto mb-12 max-w-xl text-[1.15rem] leading-relaxed text-white/75">
          Sending a track for mastering, or just want to talk music. Either way, it reaches me directly.
        </p>
        <a href={`mailto:${EMAIL}`} className="group inline-block break-all font-display text-[clamp(1.6rem,5vw,3.25rem)] leading-none text-ink">
          {EMAIL}
          <span className="mt-3 block h-px w-full origin-left scale-x-0 bg-white/40 transition-transform duration-700 group-hover:scale-x-100" />
        </a>
      </div>

      <div className="mt-16 grid gap-y-7 border-t border-white/[0.12] pt-10 text-center sm:grid-cols-3">
        {channels.map(([label, handle, href]) => (
          <div key={label}>
            <div className="eyebrow mb-2 text-white/50">{label}</div>
            <a href={href} target="_blank" rel="noopener" className="font-serif text-xl italic text-white/85 transition-colors hover:text-ink">
              {handle}
            </a>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
