import { useEffect, useRef, useState } from 'react'
import { MotionConfig, motion, useScroll, useTransform } from 'motion/react'
import { GlareCard } from './components/GlareCard'
import { AudioPlayer } from './components/AudioPlayer'
import { SceneBackdrop } from './components/SceneBackdrop'
import { Cursor } from './components/Cursor'
import { Loader } from './components/Loader'
import { Magnetic } from './components/Magnetic'
import { MaskText } from './components/MaskText'
import { useLenis } from './lib/useLenis'
import { cn } from './lib/utils'
import {
  CREDITS,
  EMAIL,
  FACTS,
  INSTAGRAM,
  PLAYLIST,
  RATES,
  RELEASE,
  SOUNDCLOUD,
  SPOTIFY_TRACK,
  SUPPORT,
} from './content'

// Section numbering is derived, so a section that has no content yet simply
// does not exist and never leaves a hole in the sequence.
const ORDER = [
  'years',
  'about',
  'services',
  ...(SUPPORT.length ? ['support'] : []),
  ...(PLAYLIST.url ? ['rotation'] : []),
  'contact',
]
const NUM: Record<string, string> = Object.fromEntries(
  ORDER.map((id, i) => [id, String(i + 1).padStart(2, '0')]),
)

const reveal = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: '-12% 0px' },
  transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
}

const lift = '[text-shadow:0_1px_14px_rgba(0,0,0,0.5)]'

const btnBase =
  'inline-flex items-center gap-2 rounded-md px-7 py-3 text-[0.7rem] font-medium uppercase tracking-[0.16em] transition-colors duration-300'
const btnSolid = cn(btnBase, 'bg-ink text-base hover:bg-white')
const btnGhost = cn(btnBase, 'border border-white/25 text-ink hover:border-white/70 hover:bg-white/[0.06]')

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 14.42a.62.62 0 0 1-.86.21c-2.35-1.44-5.3-1.76-8.79-.96a.625.625 0 1 1-.28-1.22c3.81-.87 7.08-.5 9.72 1.11.3.18.39.57.21.86zm1.22-2.72a.78.78 0 0 1-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 1 1-.45-1.49c3.63-1.1 8.15-.57 11.24 1.33.37.22.49.7.25 1.07zm.11-2.84C14.7 8.99 9.39 8.82 6.35 9.74a.936.936 0 1 1-.54-1.79c3.49-1.06 9.35-.85 13.04 1.34.44.26.59.83.33 1.28-.26.44-.83.59-1.28.33z" />
    </svg>
  )
}

function Nav() {
  const links: [string, string][] = [
    ['#years', 'Years'],
    ['#about', 'About'],
    ['#services', 'Mastering'],
  ]
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-700',
        scrolled ? 'border-white/[0.07] bg-base/70 backdrop-blur-xl' : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#home" className={cn('font-display text-xl tracking-[0.2em] text-ink', lift)}>RICEY</a>
        <div className="flex items-center gap-8">
          {links.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className={cn('group relative hidden font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white/70 transition-colors hover:text-ink sm:inline', lift)}
            >
              {label}
              <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-ink transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-full" />
            </a>
          ))}
          <Magnetic strength={0.4}>
            <a href="#contact" className={cn(btnBase, 'border border-white/30 py-2 text-ink hover:border-white/70 hover:bg-white/[0.06]')}>
              Get in touch
            </a>
          </Magnetic>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '38%'])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0])
  const letters = 'RICEY'.split('')

  return (
    <section ref={ref} id="home" className="relative flex min-h-svh items-end justify-center overflow-hidden pb-[12svh]">
      <motion.div style={{ y: contentY, opacity: contentOpacity }} className="relative z-10 mx-auto w-full max-w-6xl px-6 text-center">
        <motion.a
          href="#years"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 1.05 }}
          className={cn('eyebrow group mb-8 inline-flex items-center gap-3 text-white/70 transition-colors hover:text-ink', lift)}
        >
          <span className="h-1 w-1 rounded-full bg-[var(--color-ember)]" />
          Out now
          <span className="text-white/35">/</span>
          {RELEASE.title}
          <span className="text-white/35">/</span>
          {RELEASE.label}
        </motion.a>

        <h1
          aria-label="Ricey"
          className={cn('font-display text-[clamp(3rem,13vw,10rem)] font-medium leading-[0.9] tracking-[0.12em] text-ink', lift)}
        >
          {letters.map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden="true"
              className="inline-block"
              initial={{ opacity: 0, y: '0.28em', filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.1, delay: 1.15 + i * 0.075, ease: [0.16, 1, 0.3, 1] }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7, duration: 0.9 }}
          className={cn('mt-6 font-serif text-2xl italic text-white/80', lift)}
        >
          Artist &amp; Audio Engineer
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.9 }}
          className={cn('mt-3 font-mono text-[0.68rem] uppercase tracking-[0.28em] text-white/50', lift)}
        >
          London, UK
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2, duration: 0.8 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Magnetic>
            <a href={SPOTIFY_TRACK} target="_blank" rel="noopener" className={btnSolid}>
              <SpotifyIcon /> Listen to {RELEASE.title}
            </a>
          </Magnetic>
          <Magnetic>
            <a href="#services" className={btnGhost}>Mastering</a>
          </Magnetic>
        </motion.div>
      </motion.div>
    </section>
  )
}

function SectionLabel({ index, children }: { index: string; children: string }) {
  return (
    <div className="mb-11">
      <div className="mb-7 flex items-center gap-5">
        <span className={cn('eyebrow text-white/50', lift)}>{index}</span>
        <span className="h-px w-14 bg-white/20" />
      </div>
      <MaskText
        as="h2"
        text={children}
        className={cn('font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[1.02] text-ink', lift)}
      />
    </div>
  )
}

function Years() {
  const links = RELEASE.links.filter((l) => l.url)
  return (
    <section id="years" className="relative overflow-hidden py-36">
      <div className="ember-drift pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] rounded-full bg-[var(--color-ember)] blur-[130px]" />
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-5xl px-6">
        <SectionLabel index={NUM.years}>{RELEASE.title}</SectionLabel>

        <div className="grid items-start gap-14 md:grid-cols-[340px_1fr]">
          <GlareCard className="mx-auto aspect-square w-full max-w-[340px]">
            <img src={RELEASE.art} alt={`${RELEASE.title} cover art`} className="h-full w-full object-cover" />
          </GlareCard>

          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-white/60">
              {RELEASE.label} &middot; {RELEASE.year} &middot; {RELEASE.format}
            </p>
            <p className={cn('mt-6 max-w-md text-[1.05rem] leading-[1.85] text-white/80', lift)}>{RELEASE.blurb}</p>

            <div className="mt-10 border-t border-white/[0.14]">
              {links.map((l) => (
                <a
                  key={l.name}
                  href={l.url}
                  target="_blank"
                  rel="noopener"
                  className="group flex items-center justify-between border-b border-white/[0.1] py-4 transition-colors hover:border-white/30"
                >
                  <span className="font-display text-lg text-ink">{l.name}</span>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-white/50 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 group-hover:text-ink">
                    Play &rarr;
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

function About() {
  return (
    <section id="about" className="relative overflow-hidden py-36">
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-3xl px-6">
        <SectionLabel index={NUM.about}>About</SectionLabel>
        <div className={cn('space-y-6 text-[1.05rem] leading-[1.85] text-white/75', lift)}>
          <p>
            Ricey is a techno and progressive artist and audio engineer based in London. What started as a
            last resort, picking music after failing another subject at school, quickly became something far
            deeper. What was meant to be a backup plan turned into{' '}
            <em className="font-serif not-italic text-ink">an obsession with sound</em>.
          </p>
          <p>
            Now dedicated to crafting dark, immersive soundscapes that sit in the space between thought and
            feeling. On the engineering side the philosophy is simple: truly enhance an artist&rsquo;s vision.
            Every mix and master treated with the same precision and care.
          </p>
        </div>

        <dl className="mt-14 grid grid-cols-2 gap-x-10 gap-y-8 border-t border-white/[0.14] pt-10 sm:grid-cols-4">
          {FACTS.map(([label, value]) => (
            <div key={label}>
              <dt className="eyebrow mb-2.5 text-white/50">{label}</dt>
              <dd className={cn('font-serif text-[1.05rem] leading-snug text-ink', lift)}>{value}</dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </section>
  )
}

function Services() {
  return (
    <section id="services" className="relative overflow-hidden py-36">
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-4xl px-6">
        <SectionLabel index={NUM.services}>Mastering</SectionLabel>
        <p className={cn('mb-6 max-w-xl text-[1.25rem] leading-relaxed text-white/75', lift)}>
          Mastering, from the artist behind <em className="font-serif not-italic text-ink">{RELEASE.title}</em>.
        </p>
        <p className="mb-14 max-w-xl font-mono text-[0.68rem] uppercase leading-[2] tracking-[0.2em] text-white/50">
          {CREDITS}
        </p>

        <div className="mb-16 border-t border-white/[0.14]">
          {RATES.map((r) => (
            <div
              key={r.name}
              className="grid gap-x-10 gap-y-4 border-b border-white/[0.1] py-9 md:grid-cols-[1fr_auto] md:items-end"
            >
              <div>
                <h3 className="font-display text-[1.75rem] leading-tight text-ink">{r.name}</h3>
                <p className="mt-3 max-w-md text-[0.95rem] leading-[1.8] text-white/70">{r.desc}</p>
              </div>
              <div className="flex items-baseline gap-2 md:justify-end">
                <span className="font-display text-[2.75rem] leading-none tabular-nums text-ink">{r.price}</span>
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-white/55">{r.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <h3 className="mb-2 font-display text-2xl text-ink">Hear the difference</h3>
        <p className="mb-8 text-sm text-white/60">One track, two states. Switch while it plays.</p>
        <AudioPlayer />
      </motion.div>
    </section>
  )
}

function Support() {
  if (!SUPPORT.length) return null
  return (
    <section id="support" className="relative overflow-hidden py-36">
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-4xl px-6">
        <SectionLabel index={NUM.support}>Support</SectionLabel>
        <div className="border-t border-white/[0.14]">
          {SUPPORT.map((s) => (
            <figure key={s.quote} className="border-b border-white/[0.1] py-10">
              <blockquote className={cn('font-serif text-[1.6rem] italic leading-snug text-ink md:text-[2rem]', lift)}>
                &ldquo;{s.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-white/55">
                {s.source}
                {s.context ? <span className="text-white/35"> &middot; {s.context}</span> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

function Rotation() {
  if (!PLAYLIST.url) return null
  return (
    <section id="rotation" className="relative overflow-hidden py-36">
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-4xl px-6">
        <SectionLabel index={NUM.rotation}>{PLAYLIST.title}</SectionLabel>
        <p className={cn('mb-10 max-w-xl text-[1.25rem] leading-relaxed text-white/75', lift)}>
          What is being played, and what is being built from.
        </p>
        <Magnetic>
          <a href={PLAYLIST.url} target="_blank" rel="noopener" className={btnSolid}>
            <SpotifyIcon /> Open in Spotify
          </a>
        </Magnetic>
      </motion.div>
    </section>
  )
}

function Contact() {
  const channels: [string, string, string][] = [
    ['Instagram', '@riceymusic', INSTAGRAM],
    ['SoundCloud', 'riceymusic', SOUNDCLOUD],
    ['Spotify', 'Ricey', SPOTIFY_TRACK],
  ]
  return (
    <section id="contact" className="relative overflow-hidden py-40">
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-4xl px-6">
        <SectionLabel index={NUM.contact}>Get in touch</SectionLabel>
        <p className={cn('mb-14 max-w-xl text-[1.25rem] leading-relaxed text-white/75', lift)}>
          Sending a track for mastering, or just want to talk music. Either way, it reaches me directly.
        </p>

        <a
          href={`mailto:${EMAIL}`}
          className={cn('group inline-block font-display text-[clamp(1.75rem,5vw,3.25rem)] leading-none text-ink', lift)}
        >
          {EMAIL}
          <span className="mt-3 block h-px w-full origin-left scale-x-0 bg-white/40 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
        </a>

        <div className="mt-16 grid gap-y-7 border-t border-white/[0.12] pt-10 sm:grid-cols-3">
          {channels.map(([label, handle, href]) => (
            <div key={label}>
              <div className="eyebrow mb-2 text-white/50">{label}</div>
              <a
                href={href}
                target="_blank"
                rel="noopener"
                className={cn('font-serif text-xl italic text-white/85 transition-colors hover:text-ink', lift)}
              >
                {handle}
              </a>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.08] bg-black/85 py-12 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-5">
          <span className="font-display text-sm tracking-[0.34em] text-white/60">RICEY</span>
          <nav aria-label="Elsewhere" className="flex flex-wrap gap-7 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-white/60">
            <a href={INSTAGRAM} target="_blank" rel="noopener" className="transition-colors hover:text-ink">Instagram</a>
            <a href={SOUNDCLOUD} target="_blank" rel="noopener" className="transition-colors hover:text-ink">SoundCloud</a>
            <a href={SPOTIFY_TRACK} target="_blank" rel="noopener" className="transition-colors hover:text-ink">Spotify</a>
            <a href={`mailto:${EMAIL}`} className="transition-colors hover:text-ink">Email</a>
          </nav>
        </div>
        <div className="border-t border-white/[0.08] pt-6 text-xs text-white/55">
          &copy; 2026 Ricey. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  useLenis()
  return (
    <MotionConfig reducedMotion="user">
      <Loader />
      <Cursor />
      <a
        href="#years"
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[200] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-base"
      >
        Skip to content
      </a>
      <Nav />
      <SceneBackdrop />
      <main>
        <Hero />
        <Years />
        <About />
        <Services />
        <Support />
        <Rotation />
        <Contact />
      </main>
      <Footer />
      <div className="grain" aria-hidden />
    </MotionConfig>
  )
}
