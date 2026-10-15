import { useState } from 'react'
import { PageShell } from '../components/PageShell'
import { Light } from '../components/Light'
import { EMAIL, RATES } from '../content'
import { API_URL } from '../lib/api'
import { cn } from '../lib/utils'

// Prices sit on the service pills (Services has the full rates); the footer has the socials.
const SERVICES = [
  { name: 'Mastering', price: RATES[0].price, unit: RATES[0].unit, line: 'A finished mix, mastered for release.' },
  { name: 'Stem mastering', price: RATES[1].price, unit: RATES[1].unit, line: 'Mastered from stems for more control.' },
  { name: 'Mixing & mastering', price: '£300', unit: '/ track', line: 'From your stems to the release master.' },
]

const mailto = (subject?: string, body?: string) => {
  const q = [subject && `subject=${encodeURIComponent(subject)}`, body && `body=${encodeURIComponent(body)}`].filter(Boolean).join('&')
  return `mailto:${EMAIL}${q ? `?${q}` : ''}`
}

function Copy() {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => { void navigator.clipboard?.writeText(EMAIL); setDone(true); setTimeout(() => setDone(false), 1600) }}
      className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-white/60 hover:text-ink"
    >
      {done ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function Contact() {
  const [name, setName] = useState('')
  const [track, setTrack] = useState('')
  const [link, setLink] = useState('')
  const [svc, setSvc] = useState(SERVICES[0].name)
  const [note, setNote] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // left empty by people; bots fill it in
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [problem, setProblem] = useState('')
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const ready = Boolean(name.trim() && emailOk && track.trim() && link.trim())
  const subject = `${svc}: ${track}`
  const body = `Hi Ricey,\n\n${note.trim() ? note.trim() + '\n\n' : ''}Track: ${track}\nService: ${svc}\nFiles: ${link}\n\n${name}`
  // Sent through the site's API, so it works without an email app. Without the API (or if it
  // fails) the visitor's own email app opens with the message written.
  const send = async () => {
    if (!ready || status === 'sending') return
    if (!API_URL) {
      window.location.href = mailto(subject, body)
      return
    }
    setStatus('sending')
    setProblem('')
    try {
      const r = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, track, service: svc, link, note, website }),
      })
      if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? 'It didn’t send.')
      setStatus('sent')
    } catch (e) {
      setProblem((e as Error).message === 'Failed to fetch' ? 'It didn’t send. Check your connection.' : (e as Error).message)
      setStatus('failed')
    }
  }
  const reset = () => {
    setTrack('')
    setLink('')
    setNote('')
    setStatus('idle')
  }

  const field = 'mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-ink placeholder:text-white/30 focus:border-white/50 focus:outline-none'
  const blank = (v: string, ph: string) => (v.trim() ? <span className="text-ink">{v}</span> : <span className="text-white/30">{ph}</span>)

  return (
    <PageShell title="Contact">
      <Light height={1800} />
      <div className="relative">
        <p className="mx-auto mb-14 max-w-[60ch] text-balance text-center text-[1.05rem] leading-relaxed text-white/70">
          Sending a track for mastering, or just want to talk music. Either way, it reaches me directly.
        </p>

        <div className="grid gap-5 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {status === 'sent' ? (
            <section className="glass flex flex-col justify-center rounded-3xl p-7 sm:p-9" role="status">
              <h2 className="font-heading text-[2.4rem] leading-none text-ink">Sent.</h2>
              <p className="mt-4 max-w-md text-[1.05rem] leading-relaxed text-white/70">
                Thanks, {name.trim()}. I’ll listen to {track.trim()} and reply to <span className="text-ink">{email.trim()}</span>.
              </p>
              <div className="mt-8">
                <button type="button" onClick={reset} className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-6 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-ink hover:border-white/60">
                  Send another track
                </button>
              </div>
            </section>
          ) : (
          <form className="glass relative rounded-3xl p-7 sm:p-9" onSubmit={e => { e.preventDefault(); void send() }}>
            <h2 className="font-heading text-[2.4rem] leading-none text-ink">Send a track</h2>
            <p className="mt-3 text-[1.05rem] text-white/70">It comes straight to me, and I reply by email.</p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <label className="text-sm text-white/70">Your name<input className={field} value={name} onChange={e => setName(e.target.value)} placeholder="Artist name" autoComplete="name" /></label>
              <label className="text-sm text-white/70">Your email<input type="email" className={field} value={email} onChange={e => setEmail(e.target.value)} placeholder="So I can reply" autoComplete="email" /></label>
              <label className="text-sm text-white/70 sm:col-span-2">Track title<input className={field} value={track} onChange={e => setTrack(e.target.value)} placeholder="Track title" /></label>
            </div>
            <label aria-hidden className="absolute left-0 top-0 h-px w-px overflow-hidden opacity-0">
              Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
            </label>
            <fieldset className="mt-6">
              <legend className="text-sm text-white/70">Service</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {SERVICES.map(s => {
                  const on = s.name === svc
                  return (
                    <button key={s.name} type="button" onClick={() => setSvc(s.name)} aria-pressed={on} className={cn('inline-flex min-h-11 items-baseline gap-2 rounded-full border px-5 py-2.5 text-sm transition-colors', on ? 'border-ink bg-ink text-black' : 'border-white/20 text-white/75 hover:border-white/50')}>
                      <span>{s.name}</span>
                      <span className={cn('whitespace-nowrap text-[0.8rem] tabular-nums', on ? 'text-black/60' : 'text-white/45')}>{s.price} {s.unit}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-sm text-white/50" aria-live="polite">{SERVICES.find(s => s.name === svc)?.line}</p>
            </fieldset>
            <label className="mt-6 block text-sm text-white/70">Link to files<input className={field} value={link} onChange={e => setLink(e.target.value)} placeholder="Dropbox, Google Drive or WeTransfer" inputMode="url" /></label>
            <label className="mt-6 block text-sm text-white/70">Anything else <span className="text-white/40">(optional)</span><textarea rows={3} className={field} value={note} onChange={e => setNote(e.target.value)} placeholder="Reference tracks, release date" /></label>
            {status === 'failed' && (
              <p role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
                {problem} <a href={mailto(subject, body)} className="underline underline-offset-2">Send it from your email app instead</a>.
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button type="submit" disabled={!ready || status === 'sending'} className={cn('inline-flex min-h-11 items-center rounded-full px-6 text-[0.72rem] font-medium uppercase tracking-[0.18em]', ready ? 'bg-ink text-black hover:bg-white' : 'cursor-not-allowed bg-white/15 text-white/40')}>
                {status === 'sending' ? 'Sending…' : 'Send'}
              </button>
              {!ready && <span className="text-sm text-white/40">{email.trim() && !emailOk ? 'Check your email address' : 'Name, email, title and link needed'}</span>}
            </div>
          </form>
          )}

          <aside className="flex flex-col gap-5">
            <section className="glass flex flex-1 flex-col rounded-3xl p-7" aria-label="Email preview">
              <p className="eyebrow text-white/45">Your message</p>
              <dl className="mt-5 space-y-2 border-b border-white/10 pb-5 text-sm">
                <div className="flex gap-3"><dt className="w-16 shrink-0 text-white/45">To</dt><dd className="truncate text-white/80">Ricey</dd></div>
                <div className="flex gap-3"><dt className="w-16 shrink-0 text-white/45">Subject</dt><dd className="min-w-0 truncate">{svc}: {blank(track, 'Track title')}</dd></div>
              </dl>
              <div className="mt-5 flex-1 space-y-4 text-[0.95rem] leading-relaxed text-white/70">
                <p>Hi Ricey,</p>
                {note.trim() && <p className="whitespace-pre-wrap text-ink">{note.trim()}</p>}
                <p>
                  Track: {blank(track, 'Track title')}<br />
                  Service: <span className="text-ink">{svc}</span><br />
                  Files: <span className="break-all">{blank(link, 'Link to files')}</span>
                </p>
                <p>{blank(name, 'Your name')}</p>
              </div>
            </section>
            <section className="px-7 pt-2">
              <p className="eyebrow text-white/45">Or write directly</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a href={mailto()} className="break-all font-heading text-[1.5rem] leading-tight text-ink">{EMAIL}</a>
                <Copy />
              </div>
            </section>
          </aside>
        </div>

      </div>
    </PageShell>
  )
}
