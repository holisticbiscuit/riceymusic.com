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

const SPOTIFY = 'https://open.spotify.com/track/6IcqC8WxfxqSkZU4AEIV3c'
const INSTAGRAM = 'https://www.instagram.com/riceymusic/'
const SOUNDCLOUD = 'https://soundcloud.com/riceymusic'
const EMAIL = 'contact@riceymusic.com'

// Sections fade in place; the heading carries the vertical movement via MaskText,
// so nothing animates twice on the same easing.
const reveal = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, margin: '-12% 0px' },
  transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
}

// One shadow, tuned to lift text off a moving photograph without bolding hairlines.
const lift = '[text-shadow:0_1px_14px_rgba(0,0,0,0.5)]'

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 14.42a.62.62 0 0 1-.86.21c-2.35-1.44-5.3-1.76-8.79-.96a.625.625 0 1 1-.28-1.22c3.81-.87 7.08-.5 9.72 1.11.3.18.39.57.21.86zm1.22-2.72a.78.78 0 0 1-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 1 1-.45-1.49c3.63-1.1 8.15-.57 11.24 1.33.37.22.49.7.25 1.07zm.11-2.84C14.7 8.99 9.39 8.82 6.35 9.74a.936.936 0 1 1-.54-1.79c3.49-1.06 9.35-.85 13.04 1.34.44.26.59.83.33 1.28-.26.44-.83.59-1.28.33z" />
    </svg>
  )
}

// One button language across the whole site.
const btnBase =
  'inline-flex items-center gap-2 rounded-md px-7 py-3 text-[0.7rem] font-medium uppercase tracking-[0.16em] transition-colors duration-300'
const btnSolid = cn(btnBase, 'bg-ink text-base hover:bg-white')
const btnGhost = cn(btnBase, 'border border-white/25 text-ink hover:border-white/70 hover:bg-white/[0.06]')

function Nav() {
  const links: [string, string][] = [
    ['#about', 'About'],
    ['#music', 'Music'],
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
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 1.05 }}
          className={cn('eyebrow mb-8 text-white/60', lift)}
        >
          Signed to mau5trap
        </motion.p>

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
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.85, duration: 0.8 }}
          className={cn('mt-5 text-sm text-white/65', lift)}
        >
          Debut single &ldquo;Years&rdquo;, out now on mau5trap
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2, duration: 0.8 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Magnetic>
            <a href={SPOTIFY} target="_blank" rel="noopener" className={btnSolid}>
              <SpotifyIcon /> Listen to Years
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

// Number and rule only. The heading below states the name once.
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

function About() {
  return (
    <section id="about" className="relative overflow-hidden py-36">
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-3xl px-6">
        <SectionLabel index="01">About</SectionLabel>
        <div className={cn('space-y-6 text-[1.05rem] leading-[1.85] text-white/75', lift)}>
          <p>
            Ricey is a techno and progressive artist and audio engineer. What started as a last resort,
            picking music after failing another subject at school, quickly became something far deeper.
            What was meant to be a backup plan turned into <em className="font-serif not-italic text-ink">an obsession with sound</em>.
          </p>
          <p>
            Now dedicated to crafting dark, immersive soundscapes that sit in the space between thought and
            feeling. On the engineering side the philosophy is simple: truly enhance an artist&rsquo;s vision.
            Every mix and master treated with the same precision and care.
          </p>
        </div>
      </motion.div>
    </section>
  )
}

function Music() {
  return (
    <section id="music" className="relative overflow-hidden py-36">
      <div className="ember-drift pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[460px] rounded-full bg-[var(--color-ember)] blur-[120px]" />
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-5xl px-6">
        <SectionLabel index="02">Music</SectionLabel>
        <div className="grid items-center gap-14 md:grid-cols-[320px_1fr]">
          <GlareCard className="mx-auto aspect-square w-full max-w-[320px]">
            <img src="/images/years.jpg" alt="Years cover art" className="h-full w-full object-cover" />
          </GlareCard>
          <div>
            <div className={cn('eyebrow mb-4 flex items-center gap-2.5 text-white/60', lift)}>
              <span className="h-1 w-1 rounded-full bg-[var(--color-ember)]" /> Out now
            </div>
            <h3 className={cn('font-display text-5xl leading-none text-ink', lift)}>Years</h3>
            <p className="mt-4 font-mono text-[0.68rem] uppercase tracking-[0.24em] text-white/55">
              mau5trap &middot; 2026 &middot; Single
            </p>
            <p className={cn('mt-6 max-w-md text-[0.95rem] leading-[1.8] text-white/75', lift)}>
              Ricey&rsquo;s debut single on mau5trap. Progressive house. Personal. About time passing and
              everything you carry with you when it does.
            </p>
            <Magnetic>
              <a href={SPOTIFY} target="_blank" rel="noopener" className={cn(btnSolid, 'mt-8')}>
                <SpotifyIcon /> Listen on Spotify
              </a>
            </Magnetic>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

function Services() {
  const rates: { name: string; desc: string; price: string; unit: string }[] = [
    {
      name: 'Mastering',
      desc: 'A single track, finished for release. Loud where it should be, clear everywhere it plays.',
      price: '£50',
      unit: '/ track',
    },
    {
      name: 'Stem Mastering',
      desc: 'The same finish, working from grouped stems. More room to move when the mix calls for it.',
      price: '£50',
      unit: '+ £10 / stem',
    },
  ]
  return (
    <section id="services" className="relative overflow-hidden py-36">
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-4xl px-6">
        <SectionLabel index="03">Mastering</SectionLabel>
        <p className={cn('mb-6 max-w-xl text-[1.25rem] leading-relaxed text-white/75', lift)}>
          Mastering, from the artist behind <em className="font-serif not-italic text-ink">Years</em>.
        </p>
        <p className="mb-14 max-w-xl font-mono text-[0.68rem] uppercase leading-[2] tracking-[0.2em] text-white/50">
          Tracks mastered here have been released through Sony Music, Columbia Records, Polydor,
          Virgin Music, Universal Music Group and The Orchard.
        </p>

        <div className="mb-16 border-t border-white/[0.14]">
          {rates.map((r) => (
            <div
              key={r.name}
              className="group grid gap-x-10 gap-y-4 border-b border-white/[0.1] py-9 md:grid-cols-[1fr_auto] md:items-end"
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

function Contact() {
  const channels: [string, string, string][] = [
    ['Email', EMAIL, `mailto:${EMAIL}`],
    ['Instagram', '@riceymusic', INSTAGRAM],
    ['SoundCloud', 'riceymusic', SOUNDCLOUD],
    ['Spotify', 'Ricey', SPOTIFY],
  ]
  return (
    <section id="contact" className="relative overflow-hidden py-40">
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-4xl px-6">
        <SectionLabel index="04">Get in touch</SectionLabel>
        <p className={cn('mb-14 max-w-xl text-[1.25rem] leading-relaxed text-white/75', lift)}>
          Sending a track for mastering, or just want to talk music.
          Either way, it reaches me directly.
        </p>

        <a
          href={`mailto:${EMAIL}`}
          className={cn('group inline-block font-display text-[clamp(1.75rem,5vw,3.25rem)] leading-none text-ink', lift)}
        >
          {EMAIL}
          <span className="mt-3 block h-px w-full origin-left scale-x-0 bg-white/40 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
        </a>

        <div className="mt-16 grid gap-y-7 border-t border-white/[0.12] pt-10 sm:grid-cols-2">
          {channels.slice(1).map(([label, handle, href]) => (
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
            <a href={SPOTIFY} target="_blank" rel="noopener" className="transition-colors hover:text-ink">Spotify</a>
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
        href="#about"
        className="sr-only focus:not-sr-only focus:fixed focus:left-6 focus:top-6 focus:z-[200] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-base"
      >
        Skip to content
      </a>
      <Nav />
      <SceneBackdrop />
      <main>
        <Hero />
        <About />
        <Music />
        <Services />
        <Contact />
      </main>
      <Footer />
      <div className="grain" aria-hidden />
    </MotionConfig>
  )
}
