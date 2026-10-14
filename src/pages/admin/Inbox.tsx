import { useCallback, useEffect, useState } from 'react'
import { AuthError, apiFetch } from '../../lib/api'
import { Pill } from '../../components/Pill'

type Enquiry = { id: string; at: string; name: string; email: string; track: string; service: string; link: string; note: string }

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Tracks sent through the Contact page, newest first. Each one is also emailed when email is
// set up; this is the copy that's kept.
export function Inbox({ onAuthError }: { onAuthError: () => void }) {
  const [items, setItems] = useState<Enquiry[] | null>(null)
  const [error, setError] = useState('')

  const fail = useCallback((e: unknown) => {
    if (e instanceof AuthError) onAuthError()
    else setError((e as Error).message)
  }, [onAuthError])

  const load = useCallback(() => {
    apiFetch<Enquiry[]>('/messages').then(setItems).catch(fail)
  }, [fail])

  useEffect(load, [load])

  const remove = async (m: Enquiry) => {
    if (!window.confirm(`Delete the message from ${m.name}?`)) return
    try {
      await apiFetch(`/messages/${m.id}`, { method: 'DELETE' })
      setItems(list => list?.filter(x => x.id !== m.id) ?? null)
    } catch (e) {
      fail(e)
    }
  }

  return (
    <div>
      {error && <p role="alert" className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
      {items === null ? (
        !error && <p className="text-white/60">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-white/60">No messages yet. Tracks sent from the Contact page show up here.</p>
      ) : (
        <ul className="space-y-4">
          {items.map(m => (
            <li key={m.id} className="glass rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-heading text-2xl leading-tight text-ink">{m.track}</p>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-white/45">{when(m.at)}</p>
              </div>
              <p className="mt-1 text-sm text-white/70">
                {m.name} · <span className="text-scarf-text">{m.service}</span>
              </p>
              <a href={m.link} target="_blank" rel="noopener noreferrer" className="mt-3 block break-all text-sm text-ink underline decoration-white/30 underline-offset-4 hover:decoration-white">
                {m.link}
              </a>
              {m.note && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/70">{m.note}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Pill solid href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.track}`)}`}>Reply to {m.email}</Pill>
                <button type="button" onClick={() => remove(m)} className="min-h-11 px-2 text-sm text-red-300/80 hover:text-red-200">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
