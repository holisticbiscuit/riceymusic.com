import { useState, type FormEvent } from 'react'
import { apiFetch } from '../../lib/api'
import { ROLES, type Credit } from '../../lib/credits'
import { Pill } from '../../components/Pill'
import { Field, inputCls } from './ui'

type Found = { title: string; artist: string; date: string; art: string; url: string }

const empty: Credit = { id: '', title: '', artist: '', roles: [], date: '' }

// Add or edit one credit. Pasting a Spotify / Apple Music link fills the details and cover.
// bare: no box of its own (inside the drawer); onDelete adds a Delete button.
export function CreditForm({ initial, onSave, onCancel, onDelete, bare }: { initial?: Credit; onSave: (c: Credit) => Promise<void>; onCancel: () => void; onDelete?: () => void; bare?: boolean }) {
  const [c, setC] = useState<Credit>(initial ?? empty)
  const [link, setLink] = useState(initial?.url ?? '')
  const [versions, setVersions] = useState((initial?.versions ?? []).join('\n'))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<'lookup' | 'save' | null>(null)

  const set = (patch: Partial<Credit>) => setC(prev => ({ ...prev, ...patch }))

  const fetchDetails = async () => {
    if (!link) return
    setBusy('lookup')
    setError('')
    try {
      const f = await apiFetch<Found>(`/lookup?url=${encodeURIComponent(link)}`)
      set({ title: f.title || c.title, artist: f.artist || c.artist, date: f.date || c.date, art: f.art || c.art, url: f.url })
    } catch (err) {
      setError(`${(err as Error).message}. You can fill the fields by hand.`)
    } finally {
      setBusy(null)
    }
  }

  const toggleRole = (r: string) => set({ roles: c.roles.includes(r) ? c.roles.filter(x => x !== r) : [...c.roles, r] })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!c.roles.length) return setError('Pick at least one role.')
    setBusy('save')
    setError('')
    try {
      const v = versions.split('\n').map(s => s.trim()).filter(Boolean)
      await onSave({ ...c, url: c.url || link || undefined, versions: v.length > 1 ? v : undefined })
    } catch (err) {
      setError((err as Error).message)
      setBusy(null)
    }
  }

  return (
    <form onSubmit={submit} className={bare ? 'flex flex-col gap-5' : 'flex flex-col gap-5 rounded-2xl border border-white/10 bg-black/30 p-5 sm:p-7'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="Spotify or Apple Music link">
            <input className={inputCls} value={link} onChange={e => setLink(e.target.value)} placeholder="https://open.spotify.com/track/…" />
          </Field>
        </div>
        <Pill onClick={fetchDetails} disabled={!link || busy !== null}>{busy === 'lookup' ? 'Fetching…' : 'Fetch details'}</Pill>
      </div>

      <div className="grid gap-5 sm:grid-cols-[120px_1fr]">
        <div className="aspect-square w-[120px] overflow-hidden rounded-lg bg-white/[0.06]">
          {c.art && <img src={c.art} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="grid gap-4">
          <Field label="Title"><input className={inputCls} value={c.title} onChange={e => set({ title: e.target.value })} required /></Field>
          <Field label="Artist"><input className={inputCls} value={c.artist} onChange={e => set({ artist: e.target.value })} required /></Field>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Release date"><input className={inputCls} type="date" value={c.date} onChange={e => set({ date: e.target.value })} required /></Field>
        <Field label="Cover image URL"><input className={inputCls} value={c.art ?? ''} onChange={e => set({ art: e.target.value || undefined })} /></Field>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow mb-3 text-white/55">Your roles</legend>
        <div className="flex flex-wrap gap-2">
          {ROLES.map(r => (
            <label key={r} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm ${c.roles.includes(r) ? 'border-scarf-text bg-scarf/60 text-ink' : 'border-white/15 text-white/70'}`}>
              <input type="checkbox" className="sr-only" checked={c.roles.includes(r)} onChange={() => toggleRole(r)} />
              {r}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Versions (optional)" hint="One per line, e.g. Radio Edit and Extended Mix. Two or more shows “2 versions”.">
        <textarea className={`${inputCls} min-h-20 py-2.5`} value={versions} onChange={e => setVersions(e.target.value)} />
      </Field>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Pill type="submit" solid disabled={busy !== null}>{busy === 'save' ? 'Saving…' : 'Save credit'}</Pill>
        <Pill onClick={onCancel}>Cancel</Pill>
        {onDelete && <button type="button" onClick={onDelete} className="ml-auto min-h-11 px-2 text-sm text-red-300/80 hover:text-red-200">Delete credit</button>}
      </div>
    </form>
  )
}
