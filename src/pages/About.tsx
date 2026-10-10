import { PageShell } from '../components/PageShell'

export default function About() {
  return (
    <PageShell eyebrow="London, UK" title="About">
      <div className="mx-auto max-w-2xl space-y-6 text-[1.05rem] leading-[1.85] text-white/80">
        <p>
          Ricey is a techno and progressive artist and audio engineer based in London. What started as a last resort,
          picking music after failing another subject at school, quickly became something far deeper. What was meant to
          be a backup plan turned into <em className="font-serif not-italic text-ink">an obsession with sound</em>.
        </p>
        <p>
          Now dedicated to crafting dark, immersive soundscapes that sit in the space between thought and feeling. On the
          engineering side the philosophy is simple: truly enhance an artist&rsquo;s vision. Every mix and master treated
          with the same precision and care.
        </p>
      </div>
    </PageShell>
  )
}
