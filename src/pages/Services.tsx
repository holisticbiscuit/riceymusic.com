import { useState } from 'react'
import { PageShell } from '../components/PageShell'
import { Pill } from '../components/Pill'
import { Light } from '../components/Light'
import { RATES } from '../content'
import { SEED } from '../lib/credits'
import { cn } from '../lib/utils'

type Id = 'master' | 'stems' | 'mixmaster'

const CARDS: { id: Id; name: string; desc: string; price: string; unit: string }[] = [
  { id: 'master', name: RATES[0].name, desc: RATES[0].desc, price: RATES[0].price, unit: RATES[0].unit },
  { id: 'stems', name: RATES[1].name, desc: RATES[1].desc, price: RATES[1].price, unit: RATES[1].unit },
  { id: 'mixmaster', name: 'Mixing & mastering', desc: 'From your stems to the release master. Balanced, finished and ready to go out.', price: '£250', unit: '/ track' },
]

const STEPS = [
  ['Send', 'Your mix or stems, with a reference track if you have one.'],
  ['Listen', 'You get the master back to hear on everything you own.'],
  ['Adjust', 'Notes go back and forth until it sounds right.'],
  ['Release', 'The final files, ready for distribution.'],
]

const PREP = [
  { title: 'For mastering', text: 'Your mix as a 32-bit float WAV, with no limiting on the master bus.' },
  { title: 'For mixing & mastering', text: 'All stems as 32-bit float WAVs, with no limiting on the master bus.' },
]

const WORK = SEED.filter(c => c.art && (c.roles.includes('Mixing') || c.roles.includes('Mastering')))

function Stepper({ label, value, set, min, max }: { label: string; value: number; set: (n: number) => void; min: number; max: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/75">{label}</span>
      <span className="flex items-center gap-3">
        <button type="button" aria-label={`Fewer: ${label}`} onClick={() => set(Math.max(min, value - 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-xl text-ink hover:border-white/60">−</button>
        <span className="w-8 text-center font-heading text-2xl tabular-nums text-ink" aria-live="polite">{value}</span>
        <button type="button" aria-label={`More: ${label}`} onClick={() => set(Math.min(max, value + 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-xl text-ink hover:border-white/60">+</button>
      </span>
    </div>
  )
}

export default function Services() {
  const [id, setId] = useState<Id>('master')
  const [tracks, setTracks] = useState(1)
  const [stems, setStems] = useState(6)
  const per = id === 'master' ? 50 : id === 'stems' ? 50 + 10 * stems : 250
  const card = CARDS.find(c => c.id === id)!

  return (
    <PageShell title="Services">
      <Light height={900} />
      <div className="relative">
        <p className="mx-auto mb-14 max-w-xl text-center text-[1.15rem] leading-relaxed text-white/70">
          Mixing and mastering from the artist behind Years, for producers who want their record to translate everywhere.
        </p>

        <div role="radiogroup" aria-label="Service" className="grid gap-5 md:grid-cols-3">
          {CARDS.map(c => {
            const on = c.id === id
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setId(c.id)}
                className={cn('glass flex flex-col rounded-3xl p-7 text-left transition-colors', on && 'glass-on')}
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="font-heading text-[1.9rem] leading-none text-ink">{c.name}</span>
                  <span aria-hidden className={cn('mt-2 h-4 w-4 shrink-0 rounded-full border transition-colors', on ? 'border-ink bg-ink' : 'border-white/30')} />
                </span>
                <span className="mt-4 flex-1 text-[0.95rem] leading-relaxed text-white/65">{c.desc}</span>
                <span className="mt-8 flex items-baseline gap-2">
                  <span className="font-heading text-[2.6rem] leading-none text-ink">{c.price}</span>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-white/50">{c.unit}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="glass mt-6 grid gap-8 rounded-3xl p-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="flex flex-col gap-5">
            <p className="eyebrow text-white/50">Your project · {card.name}</p>
            <Stepper label={tracks === 1 ? 'Track' : 'Tracks'} value={tracks} set={setTracks} min={1} max={20} />
            {id === 'stems' && <Stepper label="Stems per track" value={stems} set={setStems} min={1} max={16} />}
          </div>
          <div className="md:text-right">
            <p className="eyebrow text-white/45">Total</p>
            <p className="mt-2 font-heading text-[3.5rem] leading-none text-ink">£{per * tracks}</p>
            <p className="mt-2 text-sm text-white/50">
              {id === 'stems' ? `£50 + £10 × ${stems} stems` : `£${per}`} × {tracks} {tracks === 1 ? 'track' : 'tracks'}
            </p>
            <div className="mt-6"><Pill to="/contact" solid>{id === 'master' ? 'Send your mix' : 'Send your stems'}</Pill></div>
          </div>
        </div>

        <section className="mt-24">
          <h2 className="mb-10 text-center font-heading text-[2.2rem] leading-none text-ink">How it works</h2>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="border-t border-white/15 pt-5">
                <span className="font-mono text-xs text-scarf-text">0{i + 1}</span>
                <p className="mt-3 font-heading text-xl text-ink">{t}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-24">
          <h2 className="mb-10 text-center font-heading text-[2.2rem] leading-none text-ink">What to send</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {PREP.map(p => (
              <div key={p.title} className="glass rounded-3xl p-7">
                <p className="font-heading text-2xl text-ink">{p.title}</p>
                <p className="mt-5 flex gap-3 text-[0.95rem] leading-relaxed text-white/70">
                  <span aria-hidden className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-scarf-text" />
                  {p.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24 grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow text-white/45">Hear it first</p>
            <h2 className="mt-4 font-heading text-[2.4rem] leading-[1.05] text-ink">Switch between before and after on real releases.</h2>
            <div className="mt-8"><Pill to="/before-after">Hear the difference</Pill></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {WORK.slice(0, 3).map(c => <img key={c.id} src={c.art} alt={`${c.title} by ${c.artist}`} className="aspect-square w-full rounded-xl object-cover" />)}
          </div>
        </section>

        <section className="mt-24">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="font-heading text-[2.2rem] leading-none text-ink">Recent work</h2>
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-white/45">Mixed &amp; mastered here</span>
          </div>
          <div className="grid grid-cols-4 overflow-hidden rounded-2xl sm:grid-cols-8">
            {WORK.slice(0, 8).map(c => <img key={c.id} src={c.art} alt={`${c.title} by ${c.artist}`} className="aspect-square w-full object-cover" />)}
          </div>
        </section>

        <section className="glass mt-24 grid gap-8 rounded-3xl p-8 sm:p-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <p className="max-w-xl font-heading text-[1.7rem] leading-snug text-ink">
            Send a finished mix to be mastered, or your stems to be mixed and mastered.
          </p>
          <Pill to="/contact" solid>Get in touch</Pill>
        </section>
      </div>
    </PageShell>
  )
}
