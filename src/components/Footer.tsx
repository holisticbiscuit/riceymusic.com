import { Link } from 'react-router'
import { EMAIL, INSTAGRAM, SOUNDCLOUD, SPOTIFY_TRACK } from '../content'

export function Footer() {
  const links: [string, string][] = [
    ['Instagram', INSTAGRAM],
    ['SoundCloud', SOUNDCLOUD],
    ['Spotify', SPOTIFY_TRACK],
  ]
  return (
    <footer className="relative z-10 border-t border-white/[0.08] bg-scarf-deep px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 sm:flex-row sm:items-baseline sm:justify-between">
        <Link to="/" className="font-display text-sm tracking-[0.34em] text-white/60">RICEY</Link>
        <nav aria-label="Elsewhere" className="flex flex-wrap gap-6 font-mono text-[0.64rem] uppercase tracking-[0.2em] text-white/55">
          {links.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener" className="transition-colors hover:text-ink">{label}</a>
          ))}
          <a href={`mailto:${EMAIL}`} className="transition-colors hover:text-ink">Email</a>
        </nav>
      </div>
      <p className="mx-auto mt-6 max-w-[1400px] text-xs text-white/45">&copy; 2026 Ricey. All rights reserved.</p>
    </footer>
  )
}
