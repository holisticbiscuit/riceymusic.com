import { PageShell } from '../components/PageShell'
import { FACTS } from '../content'

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

      <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-2 gap-x-10 gap-y-8 border-t border-white/[0.14] pt-10 sm:grid-cols-4">
        {FACTS.map(([label, value]) => (
          <div key={label}>
            <dt className="eyebrow mb-2.5 text-white/50">{label}</dt>
            <dd className="font-serif text-[1.05rem] leading-snug text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </PageShell>
  )
}
