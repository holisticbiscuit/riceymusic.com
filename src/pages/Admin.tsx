import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { API_URL, AuthError, apiFetch, getToken, setToken } from '../lib/api'
import { SEED, normalizeCredits, sortRoles, type Credit } from '../lib/credits'
import { usePageTitle } from '../lib/usePageTitle'
import { Pill } from '../components/Pill'
import { LoginForm } from './admin/LoginForm'
import { CreditForm } from './admin/CreditForm'
import { ABAdmin } from './admin/ABAdmin'
import { cn } from '../lib/utils'

// Private page: not linked anywhere and kept out of search results.
function useNoIndex() {
  useEffect(() => {
    const m = document.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex, nofollow'
    document.head.appendChild(m)
    return () => m.remove()
  }, [])
}

export default function Admin() {
  usePageTitle('Admin')
  useNoIndex()
  const [signedIn, setSignedIn] = useState(() => !!getToken())
  const [credits, setCredits] = useState<Credit[] | null>(null)
  const [editing, setEditing] = useState<Credit | 'new' | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'credits' | 'ab'>('credits')

  const signOut = useCallback(() => {
    setToken(null)
    setSignedIn(false)
    setCredits(null)
    setEditing(null)
  }, [])

  // Any call can find the session expired; that drops back to the login form.
  const run = useCallback(async <T,>(fn: () => Promise<T>) => {
    try {
      setError('')
      return await fn()
    } catch (err) {
      if (err instanceof AuthError) signOut()
      else setError((err as Error).message)
      throw err
    }
  }, [signOut])

  useEffect(() => {
    if (!signedIn || !API_URL) return
    let live = true
    apiFetch<Credit[]>('/credits')
      .then(list => live && setCredits(normalizeCredits(list)))
      .catch(err => {
        if (!live) return
        if (err instanceof AuthError) signOut()
        else setError((err as Error).message)
      })
    return () => {
      live = false
    }
  }, [signedIn, signOut])

  const save = async (list: Credit[]) => {
    const out = await run(() => apiFetch<Credit[]>('/credits', { method: 'PUT', body: JSON.stringify(list) }))
    setCredits(normalizeCredits(out))
    setEditing(null)
  }

  const upsert = (c: Credit) => {
    const list = credits ?? []
    const i = c.id ? list.findIndex(x => x.id === c.id) : -1
    return save(i >= 0 ? list.map(x => (x.id === c.id ? c : x)) : [...list, c])
  }

  const remove = (c: Credit) => {
    if (!window.confirm(`Delete “${c.title}” by ${c.artist}?`)) return
    save((credits ?? []).filter(x => x.id !== c.id)).catch(() => {})
  }

  return (
    <div className="relative min-h-svh bg-scarf-deep px-5 pb-24 pt-10 text-ink-soft sm:px-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(70%_100%_at_50%_0%,var(--color-scarf),transparent_75%)]" />
      <div className="relative mx-auto max-w-3xl">
        <header className="mb-12 flex items-center justify-between">
          <Link to="/" className="font-display text-lg tracking-[0.22em] text-ink">RICEY</Link>
          {signedIn && <button type="button" onClick={signOut} className="eyebrow min-h-11 text-white/60 hover:text-ink">Sign out</button>}
        </header>
        <h1 className="mb-8 font-heading text-[clamp(2.75rem,7vw,4.5rem)] leading-none text-ink">Admin</h1>

        {!API_URL ? (
          <p className="text-white/70">The admin needs the API. Set <code>VITE_API_URL</code> and rebuild.</p>
        ) : !signedIn ? (
          <LoginForm onSignedIn={() => setSignedIn(true)} />
        ) : (
          <>
            <div role="tablist" aria-label="Section" className="mb-10 inline-flex rounded-full bg-black/40 p-1">
              {([['credits', 'Credits'], ['ab', 'Before / After']] as const).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('min-h-11 rounded-full px-6 text-sm transition-colors', tab === id ? 'bg-ink text-black' : 'text-white/70 hover:text-ink')}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'ab' ? (
              <ABAdmin credits={credits?.length ? credits : SEED} onAuthError={signOut} />
            ) : (
            <>
            {error && !editing && <p role="alert" className="mb-6 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

            {editing ? (
              <CreditForm initial={editing === 'new' ? undefined : editing} onSave={upsert} onCancel={() => setEditing(null)} />
            ) : (
              <div className="mb-8 flex flex-wrap gap-3">
                <Pill solid onClick={() => setEditing('new')}>Add credit</Pill>
                <Pill to="/credits">View credits page</Pill>
              </div>
            )}

            {credits === null ? (
              <p className="mt-8 text-white/60">Loading…</p>
            ) : credits.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-white/10 p-6">
                <p className="mb-5 text-white/75">No credits stored yet. The public page is showing the {SEED.length} built-in ones.</p>
                <Pill solid onClick={() => save(SEED).catch(() => {})}>Import the {SEED.length} built-in credits</Pill>
              </div>
            ) : (
              <>
              <MissingSeed credits={credits} onAdd={missing => save([...credits, ...missing]).catch(() => {})} />
              <ul className="mt-8 divide-y divide-white/[0.08] border-y border-white/[0.08]">
                {credits.map(c => (
                  <li key={c.id} className="flex items-center gap-4 py-3">
                    {c.art ? <img src={c.art} alt="" className="h-14 w-14 shrink-0 object-cover" /> : <span className="h-14 w-14 shrink-0 bg-scarf" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-xl leading-tight text-ink">{c.title}</p>
                      <p className="truncate text-sm text-white/60">{c.artist} <span className="text-white/35">{c.date}</span></p>
                      <p className="mt-1 flex flex-wrap gap-x-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-scarf-text">
                        {sortRoles(c.roles).map(r => <span key={r}>{r}</span>)}
                      </p>
                    </div>
                    <button type="button" onClick={() => setEditing(c)} className="min-h-11 px-2 text-sm text-white/70 hover:text-ink">Edit</button>
                    <button type="button" onClick={() => remove(c)} className="min-h-11 px-2 text-sm text-red-300/80 hover:text-red-200">Delete</button>
                  </li>
                ))}
              </ul>
              </>
            )}
            </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Credits added to the site's built-in list after the stored list was imported.
function MissingSeed({ credits, onAdd }: { credits: Credit[]; onAdd: (missing: Credit[]) => void }) {
  const ids = new Set(credits.map(c => c.id))
  const missing = SEED.filter(s => !ids.has(s.id))
  if (!missing.length) return null
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-scarf/30 p-5">
      <p className="mb-4 text-sm text-white/80">
        {missing.length} built-in {missing.length === 1 ? 'credit isn’t' : 'credits aren’t'} in your list yet:{' '}
        <span className="text-ink">{missing.map(m => m.title).join(', ')}</span>
      </p>
      <Pill solid onClick={() => onAdd(missing)}>Add {missing.length === 1 ? 'it' : `all ${missing.length}`}</Pill>
    </div>
  )
}
