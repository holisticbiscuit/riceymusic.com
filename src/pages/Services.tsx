import { PageShell } from '../components/PageShell'
import { Pill } from '../components/Pill'
import { CREDITS, RATES, RELEASE } from '../content'

export default function Services() {
  return (
    <PageShell eyebrow="Mixing & mastering" title="Services">
      <p className="mb-6 max-w-xl text-[1.2rem] leading-relaxed text-white/75">
        Mastering, from the artist behind <em className="font-serif not-italic text-ink">{RELEASE.title}</em>.
      </p>
      <p className="mb-14 max-w-xl font-mono text-[0.68rem] uppercase leading-[2] tracking-[0.2em] text-white/50">{CREDITS}</p>

      <div className="mb-16 border-t border-white/[0.14]">
        {RATES.map(r => (
          <div key={r.name} className="grid gap-x-10 gap-y-4 border-b border-white/[0.1] py-9 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h2 className="font-display text-[1.75rem] leading-tight text-ink">{r.name}</h2>
              <p className="mt-3 max-w-md text-[0.95rem] leading-[1.8] text-white/70">{r.desc}</p>
            </div>
            <div className="flex items-baseline gap-2 md:justify-end">
              <span className="font-display text-[2.75rem] leading-none tabular-nums text-ink">{r.price}</span>
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-white/55">{r.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Pill to="/before-after">Hear the difference</Pill>
        <Pill to="/contact" solid>Send a track</Pill>
      </div>
    </PageShell>
  )
}
