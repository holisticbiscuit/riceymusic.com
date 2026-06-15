import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import { Spotlight } from './components/Spotlight'
import { TextGenerateEffect } from './components/TextGenerateEffect'
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

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-12% 0px' },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
}

const shadowSm = '[text-shadow:0_1px_18px_rgba(0,0,0,0.55)]'

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 14.42a.62.62 0 0 1-.86.21c-2.35-1.44-5.3-1.76-8.79-.96a.625.625 0 1 1-.28-1.22c3.81-.87 7.08-.5 9.72 1.11.3.18.39.57.21.86zm1.22-2.72a.78.78 0 0 1-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 1 1-.45-1.49c3.63-1.1 8.15-.57 11.24 1.33.37.22.49.7.25 1.07zm.11-2.84C14.7 8.99 9.39 8.82 6.35 9.74a.936.936 0 1 1-.54-1.79c3.49-1.06 9.35-.85 13.04 1.34.44.26.59.83.33 1.28-.26.44-.83.59-1.28.33z" />
    </svg>
  )
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 })
  return <motion.div style={{ scaleX }} className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-[var(--color-ember)]" aria-hidden />
}

function Nav() {
  const links: [string, string][] = [
    ['#about', 'About'],
    ['#music', 'Music'],
    ['#services', 'Services'],
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
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-500',
        scrolled ? 'border-white/[0.07] bg-base/70 backdrop-blur-xl' : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#home" className={cn('font-display text-xl tracking-[0.18em] text-ink', shadowSm)}>RICEY</a>
        <div className="flex items-center gap-7">
          {links.map(([href, label]) => (
            <a key={href} href={href} className={cn('group relative hidden font-mono text-[0.72rem] uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-ink sm:inline', shadowSm)}>
              {label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-ink transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
          <Magnetic strength={0.5}>
            <a href="#contact" className="inline-block rounded bg-ink px-4 py-2 text-xs font-semibold tracking-wide text-base shadow-lg shadow-black/30">
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

  return (
    <section ref={ref} id="home" className="relative flex min-h-svh items-end justify-center overflow-hidden pb-[12vh]">
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" />

      <motion.div style={{ y: contentY, opacity: contentOpacity }} className="relative z-10 mx-auto w-full max-w-6xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 1.8 }}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1.5 backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-ink" />
          <span className="eyebrow text-white/70">Newly signed &middot; <strong className="font-semibold text-ink">mau5trap</strong></span>
        </motion.div>

        <h1 className={cn('whitespace-nowrap font-display text-[clamp(2.8rem,12.5vw,9.5rem)] font-medium leading-[0.9] tracking-[0.06em] text-ink', shadowSm)}>
          <TextGenerateEffect words="R I C E Y" delay={1.9} />
        </h1>

        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5, duration: 0.8 }}
          className={cn('mt-5 font-serif text-2xl italic text-white/80', shadowSm)}
        >
          Artist &amp; Audio Engineer
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.65, duration: 0.7 }}
          className={cn('mt-6 text-sm text-white/65', shadowSm)}
        >
          New single <em className="font-serif text-base text-white/90">&ldquo;Years&rdquo;</em>, out now on mau5trap
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.8, duration: 0.7 }}
          className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Magnetic>
            <a href={SPOTIFY} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-md bg-ink px-7 py-3 text-xs font-medium uppercase tracking-[0.14em] text-base transition-colors">
              <SpotifyIcon /> Listen on Spotify
            </a>
          </Magnetic>
          <Magnetic>
            <a href="#services" className="inline-block rounded-md border border-white/25 px-7 py-3 text-xs uppercase tracking-[0.14em] text-ink transition-colors hover:border-white/60 hover:bg-white/5">
              Services
            </a>
          </Magnetic>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.1, duration: 1 }}
        style={{ opacity: contentOpacity }}
        className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="eyebrow text-[0.6rem] text-white/40"
        >
          Scroll
        </motion.div>
      </motion.div>
    </section>
  )
}

function SectionLabel({ index, children }: { index: string; children: string }) {
  return (
    <div className="mb-6">
      <div className="eyebrow mb-5 w-28 border-b border-white/[0.14] pb-3 text-white/50">{index}</div>
      <MaskText as="h2" text={children} className={cn('font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[1.02] text-ink', shadowSm)} />
    </div>
  )
}

function About() {
  return (
    <section id="about" className="relative overflow-hidden py-32">
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-3xl px-6">
        <SectionLabel index="01 / About">About</SectionLabel>
        <div className={cn('space-y-5 text-[1.05rem] leading-[1.85] text-white/75', shadowSm)}>
          <p>Ricey is a techno and progressive artist and audio engineer. What started as a last resort, picking music after failing another subject at school, quickly became something far deeper. What was meant to be a backup plan turned into <em className="font-serif text-ink">an obsession with sound</em>.</p>
          <p>Now dedicated to crafting dark, immersive soundscapes that sit in the space <em className="font-serif text-ink">between thought and feeling</em>. On the engineering side, the philosophy is simple: truly enhance an artist's vision. Every mix and master treated with the same precision and care.</p>
        </div>
      </motion.div>
    </section>
  )
}

function Music() {
  return (
    <section id="music" className="relative overflow-hidden py-32">
      <div className="ember-drift pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[460px] rounded-full bg-[var(--color-ember)] blur-[120px]" />
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-5xl px-6">
        <SectionLabel index="02 / Music">Music</SectionLabel>
        <div className="grid items-center gap-10 md:grid-cols-[300px_1fr]">
          <GlareCard className="mx-auto aspect-square w-full max-w-[300px]">
            <img src="/images/years.jpg" alt="Ricey, Years cover art" className="h-full w-full object-cover" />
          </GlareCard>
          <div>
            <div className={cn('eyebrow mb-3 flex items-center gap-2 text-white/60', shadowSm)}><span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ember)]" /> Out now on mau5trap</div>
            <h3 className={cn('font-serif text-5xl italic text-ink', shadowSm)}>Years</h3>
            <div className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-white/55">mau5trap &middot; 2026 &middot; Single</div>
            <p className={cn('mt-4 max-w-md text-[0.95rem] leading-relaxed text-white/75', shadowSm)}>Ricey's debut single on mau5trap. Progressive house. Personal. About time passing and everything you carry with you when it does.</p>
            <Magnetic>
              <a href={SPOTIFY} target="_blank" rel="noopener" className="mt-6 inline-flex items-center gap-2 rounded-md bg-ink px-6 py-3 text-xs font-medium uppercase tracking-[0.14em] text-base transition-colors">
                <SpotifyIcon /> Listen on Spotify
              </a>
            </Magnetic>
            <div className="mt-6 max-w-xl overflow-hidden rounded-xl">
              <iframe
                src="https://open.spotify.com/embed/track/6IcqC8WxfxqSkZU4AEIV3c?utm_source=generator&theme=0"
                width="100%" height={80} loading="lazy" title="Years by Ricey on Spotify"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                style={{ border: 0 }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

function Services() {
  const rates: [string, string, string][] = [
    ['Mastering', 'A single track, finished for release. Loud where it should be, clear everywhere it plays.', '£50 / track'],
    ['Stem Mastering', 'The same finish, working from grouped stems. More room to move when the mix calls for it.', '£50 + £10 / stem'],
  ]
  return (
    <section id="services" className="relative overflow-hidden py-32">
      <div className="absolute inset-0 bg-base/35" />
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-4xl px-6">
        <SectionLabel index="03 / Mastering">Mastering</SectionLabel>
        <p className={cn('mb-4 text-[1.3rem] text-white/70', shadowSm)}>Mastering, from the artist behind <em className="font-serif text-ink">Years</em>.</p>
        <p className="mb-10 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white/55">
          Sony Music &middot; Columbia Records &middot; Polydor &middot; Virgin Music &middot; Universal Music Group &middot; The Orchard
        </p>
        <div className="mb-12 border-t border-white/[0.14]">
          {rates.map(([name, desc, price]) => (
            <div key={name} className="grid items-baseline gap-x-8 gap-y-1 border-b border-white/[0.1] py-6 md:grid-cols-[200px_1fr_auto]">
              <h3 className="font-serif text-2xl text-ink">{name}</h3>
              <p className="max-w-md text-[0.92rem] leading-relaxed text-white/70">{desc}</p>
              <span className="font-mono text-sm tabular-nums text-ink">{price}</span>
            </div>
          ))}
        </div>
        <h3 className="mb-1 font-serif text-2xl italic text-ink">Hear the difference.</h3>
        <p className="mb-6 text-sm text-white/55">One track, two states. Switch while it plays.</p>
        <AudioPlayer />
      </motion.div>
    </section>
  )
}

function Contact() {
  return (
    <section id="contact" className="relative overflow-hidden py-36">
      <motion.div {...reveal} className="relative z-10 mx-auto max-w-3xl px-6">
        <SectionLabel index="04 / Get in touch">Get in touch</SectionLabel>
        <p className={cn('mb-10 text-[1.3rem] text-white/70', shadowSm)}>Interested in working together? <em className="font-serif text-ink">Let&rsquo;s talk.</em></p>
        <div className="space-y-8">
          <div>
            <div className="eyebrow mb-2 text-white/50">Email</div>
            <a href="mailto:contact@riceymusic.com" className={cn('font-serif text-3xl italic text-white/90 transition-colors hover:text-ink md:text-4xl', shadowSm)}>contact@riceymusic.com</a>
          </div>
          <div>
            <div className="eyebrow mb-2 text-white/50">Socials</div>
            <a href="https://www.instagram.com/riceymusic/" target="_blank" rel="noopener" className={cn('font-serif text-2xl italic text-white/90 transition-colors hover:text-ink', shadowSm)}>Instagram</a>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.08] bg-black/85 py-10 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <span className="font-display text-sm tracking-[0.3em] text-white/55">RICEY</span>
          <nav className="flex flex-wrap gap-6 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white/55">
            <a href="https://www.instagram.com/riceymusic/" target="_blank" rel="noopener" className="hover:text-ink">Instagram</a>
            <a href="https://soundcloud.com/riceymusic" target="_blank" rel="noopener" className="hover:text-ink">SoundCloud</a>
            <a href={SPOTIFY} target="_blank" rel="noopener" className="hover:text-ink">Spotify</a>
            <a href="mailto:contact@riceymusic.com" className="hover:text-ink">Email</a>
          </nav>
        </div>
        <div className="border-t border-white/[0.08] pt-5 text-xs text-white/45">&copy; 2026 Ricey &middot; mau5trap. All rights reserved.</div>
      </div>
    </footer>
  )
}

export default function App() {
  useLenis()
  return (
    <>
      <Loader />
      <Cursor />
      <ScrollProgress />
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
    </>
  )
}
