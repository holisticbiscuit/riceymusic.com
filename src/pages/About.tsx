import { PageShell } from '../components/PageShell'
import { Pill } from '../components/Pill'
import { Light } from '../components/Light'
import { SEED } from '../lib/credits'

const COVERS = SEED.filter(c => c.art).slice(0, 6)

export default function About() {
  return (
    <PageShell title="About">
      <Light height={1300} />
      <div className="relative">
        <p className="mx-auto max-w-2xl text-center text-[1.15rem] leading-[1.85] text-white/75">
          Ricey is a techno and progressive artist and audio engineer based in London. What started as a last resort,
          picking music after failing another subject at school, quickly became something far deeper. What was meant to
          be a backup plan turned into <em className="font-heading text-[1.18em] not-italic text-ink">an obsession with sound</em>.
        </p>

        <div className="mt-16 grid gap-5 md:grid-cols-2">
          <section className="glass flex flex-col overflow-hidden rounded-3xl">
            <img src="/images/portrait-tee.webp" alt="Ricey" className="aspect-[16/10] w-full object-cover object-[50%_28%]" />
            <div className="flex flex-1 flex-col p-7">
              <p className="eyebrow text-scarf-text">The artist</p>
              <h2 className="mt-4 font-heading text-[2.2rem] leading-[1.05] text-ink">Dark, immersive soundscapes.</h2>
              <p className="mt-4 flex-1 leading-relaxed text-white/65">Music that sits in the space between thought and feeling.</p>
              <div className="mt-7"><Pill to="/artist">Artist</Pill></div>
            </div>
          </section>
          <section className="glass flex flex-col overflow-hidden rounded-3xl">
            <div className="grid aspect-[16/10] grid-cols-3">
              {COVERS.map(c => <img key={c.id} src={c.art} alt="" className="h-full w-full object-cover" />)}
            </div>
            <div className="flex flex-1 flex-col p-7">
              <p className="eyebrow text-scarf-text">The engineer</p>
              <h2 className="mt-4 font-heading text-[2.2rem] leading-[1.05] text-ink">Truly enhance an artist’s vision.</h2>
              <p className="mt-4 flex-1 leading-relaxed text-white/65">Every mix and master treated with the same precision and care.</p>
              <div className="mt-7"><Pill to="/services">Services</Pill></div>
            </div>
          </section>
        </div>

        <p className="mx-auto mt-16 max-w-2xl text-center text-[1.15rem] leading-[1.85] text-white/75">
          Now dedicated to crafting dark, immersive soundscapes that sit in the space between thought and feeling. On the
          engineering side the philosophy is simple: truly enhance an artist&rsquo;s vision. Every mix and master treated
          with the same precision and care.
        </p>
      </div>
    </PageShell>
  )
}
