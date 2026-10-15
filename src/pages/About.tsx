import { PageShell } from '../components/PageShell'
import { Pill } from '../components/Pill'
import { Light } from '../components/Light'
import { SEED } from '../lib/credits'

const COVERS = SEED.filter(c => c.art).slice(0, 6)

export default function About() {
  return (
    <PageShell title="About">
      <Light height={1100} />
      <div className="relative">
        <p className="mx-auto max-w-2xl text-pretty text-center text-[1.15rem] leading-[1.85] text-white/70">
          Ricey is a techno and progressive artist and audio engineer based in London. What started as a last resort,
          picking music after failing another subject at school, quickly became something far deeper. What was meant to
          be a backup plan turned into <em className="font-heading text-[1.18em] not-italic text-ink">an obsession with sound</em>.
        </p>

        <div className="mt-20 grid gap-6 md:grid-cols-2">
          <section className="glass flex flex-col overflow-hidden rounded-3xl">
            <img src="/images/portrait-tee.webp" alt="Ricey" className="aspect-[16/10] w-full object-cover object-[50%_28%]" />
            <div className="flex flex-1 flex-col p-7 sm:p-8">
              <h2 className="text-balance font-heading text-[2.4rem] leading-[1.05] text-ink">The artist</h2>
              <p className="mt-4 max-w-[60ch] flex-1 leading-relaxed text-white/70">Techno and progressive music, made in London.</p>
              <div className="mt-8"><Pill to="/artist">Artist</Pill></div>
            </div>
          </section>
          <section className="glass flex flex-col overflow-hidden rounded-3xl">
            <div className="grid aspect-[16/10] grid-cols-3 grid-rows-2 overflow-hidden">
              {COVERS.map(c => <img key={c.id} src={c.art} alt="" className="h-full min-h-0 w-full object-cover" />)}
            </div>
            <div className="flex flex-1 flex-col p-7 sm:p-8">
              <h2 className="text-balance font-heading text-[2.4rem] leading-[1.05] text-ink">The engineer</h2>
              <p className="mt-4 max-w-[60ch] flex-1 leading-relaxed text-white/70">
                Truly enhance an artist&rsquo;s vision. Every mix and master treated with the same precision and care.
              </p>
              <div className="mt-8"><Pill to="/services">Services</Pill></div>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  )
}
