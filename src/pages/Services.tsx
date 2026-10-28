import { useState } from 'react'
import { SealCheck } from '@phosphor-icons/react'
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
  { id: 'mixmaster', name: 'Mixing & mastering', desc: 'From your stems to the release master. Balanced, finished and ready to go out.', price: '£300', unit: '/ track' },
]

// Step 1 points at "What to send" rather than restating it; the list sits right under the steps.
const STEPS = [
  ['Send', 'Your files, prepared as below, with a reference track if you have one.'],
  ['Listen', 'You get the master back to hear on everything you own.'],
  ['Adjust', 'Notes go back and forth until it sounds right.'],
  ['Release', 'The final files, ready for distribution.'],
]

const PREP = [
  { title: 'For mastering', text: 'Your mix as a 32-bit float WAV, with no limiting on the master bus.' },
  { title: 'For mixing & mastering', text: 'All stems as 32-bit float WAVs, with no limiting on the master bus.' },
]

const WORK = SEED.filter(c => c.art && (c.roles.includes('Mixing') || c.roles.includes('Mastering')))

// one rhythm for the whole page
const SECTION = 'mt-28'
const HEAD = 'text-center font-heading text-[2.4rem] leading-[1.1] text-balance text-ink'
const BODY = 'text-[1rem] leading-relaxed text-white/70'

function Stepper({ label, value, set, min, max }: { label: string; value: number; set: (n: number) => void; min: number; max: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/70">{label}</span>
      <span className="flex items-center gap-3">
        <button type="button" aria-label={`Fewer: ${label}`} disabled={value <= min} onClick={() => set(Math.max(min, value - 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-xl text-ink transition-colors hover:border-white/60 disabled:opacity-30">−</button>
        <span className="w-8 text-center font-heading text-2xl tabular-nums text-ink" aria-live="polite">{value}</span>
        <button type="button" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => set(Math.min(max, value + 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-xl text-ink transition-colors hover:border-white/60 disabled:opacity-30">+</button>
      </span>
    </div>
  )
}

export default function Services() {
  const [id, setId] = useState<Id>('master')
  const [tracks, setTracks] = useState(1)
  const [stems, setStems] = useState(6)
  const per = id === 'master' ? 80 : id === 'stems' ? 80 + 10 * stems : 300
  const card = CARDS.find(c => c.id === id)!

  return (
    <PageShell title="Services">
      <Light height={900} />
      <div className="relative">
        <p className="mx-auto mb-14 max-w-[52ch] text-balance text-center text-[1.15rem] leading-relaxed text-white/70">
          Mixing and mastering from the artist behind Years, for producers who want their record to translate everywhere.
        </p>

        {/* the choice: the page's only glass */}
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
                  <span className="font-heading text-[1.9rem] leading-tight text-balance text-ink">{c.name}</span>
                  <span aria-hidden className={cn('mt-2 h-4 w-4 shrink-0 rounded-full border transition-colors', on ? 'border-ink bg-ink' : 'border-white/30')} />
                </span>
                <span className={cn('mt-4 flex-1', BODY)}>{c.desc}</span>
                <span className="mt-8 flex items-baseline gap-2">
                  <span className="font-heading text-[2.6rem] leading-none text-ink">{c.price}</span>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-white/50">{c.unit}</span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-sm text-white/60">
          <SealCheck size={16} weight="light" className="shrink-0 text-scarf-text" aria-hidden />
          Every master is delivered label ready, to the spec your label or distributor asks for.
        </p>

        {/* the builder for the chosen card: flat, ruled off, so the cards stay the one panel group */}
        <div className="mt-8 grid gap-8 border-y border-white/12 px-1 py-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:px-2">
          <div className="flex max-w-md flex-col gap-5">
            <p className="eyebrow text-white/50">Your project · {card.name}</p>
            <Stepper label={tracks === 1 ? 'Track' : 'Tracks'} value={tracks} set={setTracks} min={1} max={20} />
            {id === 'stems' && <Stepper label="Stems per track" value={stems} set={setStems} min={1} max={16} />}
          </div>
          <div className="md:text-right">
            <p className="eyebrow text-white/50">Total</p>
            <p className="mt-2 font-heading text-[3.5rem] leading-none text-ink">£{per * tracks}</p>
            <p className="mt-2 text-sm text-white/50">
              {id === 'stems' ? `£80 + £10 × ${stems} stems` : `£${per}`} × {tracks} {tracks === 1 ? 'track' : 'tracks'}
            </p>
            <div className="mt-6"><Pill to="/contact" solid>{id === 'master' ? 'Send your mix' : 'Send your stems'}</Pill></div>
          </div>
        </div>

        <section className={SECTION}>
          <h2 className={HEAD}>How it works</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="border-t border-white/15 pt-5">
                <span className="font-mono text-xs text-scarf-text">0{i + 1}</span>
                <p className="mt-3 font-heading text-xl text-ink">{t}</p>
                <p className={cn('mt-2', BODY)}>{d}</p>
              </li>
            ))}
          </ol>

          {/* what to send: the detail behind step 1, on the page rather than in panels */}
          <div className="mt-14">
            <h3 className="text-center font-heading text-2xl text-ink">What to send</h3>
            <dl className="mx-auto mt-8 grid max-w-3xl gap-8 md:grid-cols-2">
              {PREP.map(p => (
                <div key={p.title} className="border-l border-scarf-text/60 pl-5">
                  <dt className="eyebrow text-white/50">{p.title}</dt>
                  <dd className={cn('mt-3 max-w-[60ch]', BODY)}>{p.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* the covers once, with the way to hear them */}
        <section className={SECTION}>
          <h2 className={HEAD}>Recent work</h2>
          <p className={cn('mx-auto mt-4 max-w-[52ch] text-balance text-center', BODY)}>
            Mixed and mastered here. Switch between before and after on real releases.
          </p>
          <div className="mt-10 grid grid-cols-4 overflow-hidden rounded-2xl sm:grid-cols-8">
            {WORK.slice(0, 8).map(c => <img key={c.id} src={c.art} alt={`${c.title} by ${c.artist}`} className="aspect-square w-full object-cover" />)}
          </div>
          <div className="mt-8 flex justify-center"><Pill to="/before-after">Hear the difference</Pill></div>
        </section>

        {/* the one closing call to action */}
        <section className={cn(SECTION, 'flex flex-col items-center text-center')}>
          <p className="max-w-[24ch] text-balance font-heading text-[2.4rem] leading-[1.15] text-ink">
            Send a finished mix to be mastered, or your stems to be mixed and mastered.
          </p>
          <div className="mt-8"><Pill to="/contact" solid>Get in touch</Pill></div>
        </section>
      </div>
    </PageShell>
  )
}
