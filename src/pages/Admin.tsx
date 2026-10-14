import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, CaretRight, House, MagnifyingGlass, Plus, Tray, VinylRecord, Waveform, X } from '@phosphor-icons/react'
import { API_URL, AuthError, apiFetch, getToken, setToken } from '../lib/api'
import { SEED, normalizeCredits, sortRoles, type Credit } from '../lib/credits'
import { AB_TRACKS, fmt, toTracks, type ABTrack } from '../lib/ab'
import { usePageTitle } from '../lib/usePageTitle'
import { cn } from '../lib/utils'
import { Pill } from '../components/Pill'
import { LoginForm } from './admin/LoginForm'
import { CreditForm } from './admin/CreditForm'
import { AddPair } from './admin/AddPair'
import { ABPlayer } from './admin/ABPlayer'
import { Confirm, Drawer } from './admin/Drawer'
import { MessageList, MessageView } from './admin/Inbox'
import { useReadMessages, when, type Enquiry } from './admin/messages'

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

type Section = 'home' | 'inbox' | 'credits' | 'ab'
type Open =
  | { kind: 'release'; credit: Credit; tab: 'details' | 'ab' }
  | { kind: 'pair'; pair: ABTrack } // a pair whose credit has since been deleted
  | { kind: 'new-credit' }
  | { kind: 'new-pair' }
  | { kind: 'message'; message: Enquiry }
  | null

const NAV: { id: Section; label: string; short: string; Icon: typeof House }[] = [
  { id: 'home', label: 'Home', short: 'Home', Icon: House },
  { id: 'inbox', label: 'Inbox', short: 'Inbox', Icon: Tray },
  { id: 'credits', label: 'Credits', short: 'Credits', Icon: VinylRecord },
  { id: 'ab', label: 'Before / After', short: 'B / A', Icon: Waveform },
]

// A commit to the site's repo takes about two minutes to build and deploy.
const LIVE_AFTER_MS = 150_000

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning.' : h < 18 ? 'Good afternoon.' : 'Good evening.'
}
const today = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

export default function Admin() {
  usePageTitle('Admin')
  useNoIndex()
  const [signedIn, setSignedIn] = useState(() => !!getToken())

  if (!API_URL) {
    return <Gate><p className="text-white/70">The admin needs the API. Set <code>VITE_API_URL</code> and rebuild.</p></Gate>
  }
  if (!signedIn) {
    return <Gate><LoginForm onSignedIn={() => setSignedIn(true)} /></Gate>
  }
  return <Dashboard onSignOut={() => { setToken(null); setSignedIn(false) }} />
}

function Gate({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-svh bg-scarf-deep px-5 pb-24 pt-10 text-ink-soft sm:px-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(70%_100%_at_50%_0%,var(--color-scarf),transparent_75%)]" />
      <div className="relative mx-auto max-w-sm">
        <Link to="/" className="font-display text-lg tracking-[0.22em] text-ink">RICEY</Link>
        <h1 className="mb-10 mt-16 font-heading text-[clamp(2.75rem,7vw,4rem)] leading-none text-ink">Admin</h1>
        {children}
      </div>
    </div>
  )
}

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [section, setSection] = useState<Section>('home')
  const [open, setOpen] = useState<Open>(null)
  const [credits, setCredits] = useState<Credit[] | null>(null)
  const [pairs, setPairs] = useState<ABTrack[] | null>(null)
  const [messages, setMessages] = useState<Enquiry[] | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [going, setGoing] = useState<Record<string, true>>({})
  const { isRead, markRead } = useReadMessages()

  // Any call can find the session expired; that drops back to the sign-in form.
  const fail = useCallback((e: unknown) => {
    if (e instanceof AuthError) onSignOut()
    else setError((e as Error).message)
  }, [onSignOut])

  useEffect(() => {
    let live = true
    apiFetch<Credit[]>('/credits').then(l => live && setCredits(normalizeCredits(l))).catch(e => live && fail(e))
    apiFetch<Record<string, Omit<ABTrack, 'id'>>>('/ab')
      .then(d => live && setPairs(toTracks(d)))
      .catch(e => {
        if (!live) return
        setPairs(AB_TRACKS) // what the site was built with
        fail(e)
      })
    apiFetch<Enquiry[]>('/messages').then(l => live && setMessages(l)).catch(e => live && fail(e))
    return () => {
      live = false
    }
  }, [fail])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(id)
  }, [toast])

  const isGoing = (id: string) => !!going[id]

  const allCredits = credits?.length ? credits : SEED
  const pairFor = (c: Credit) => pairs?.find(p => p.title === c.title)
  const openPair = (p: ABTrack) => {
    const c = allCredits.find(x => x.title === p.title)
    setOpen(c ? { kind: 'release', credit: c, tab: 'ab' } : { kind: 'pair', pair: p })
  }
  const unread = (messages ?? []).filter(m => !isRead(m.id))

  // The stored credit list is replaced whole on every change (one small KV write).
  const saveCredits = async (list: Credit[]) => {
    const out = await apiFetch<Credit[]>('/credits', { method: 'PUT', body: JSON.stringify(list) })
    setCredits(normalizeCredits(out))
  }
  const upsertCredit = async (c: Credit) => {
    const list = credits ?? []
    const i = c.id ? list.findIndex(x => x.id === c.id) : -1
    try {
      await saveCredits(i >= 0 ? list.map(x => (x.id === c.id ? c : x)) : [...list, c])
      setToast(`Saved ${c.title}`)
      setOpen(null)
    } catch (e) {
      fail(e)
      throw e
    }
  }
  const deleteCredit = async (c: Credit) => {
    try {
      await saveCredits((credits ?? []).filter(x => x.id !== c.id))
      setToast(`Deleted ${c.title}`)
      setOpen(null)
    } catch (e) {
      fail(e)
    }
  }
  const published = (p: ABTrack) => {
    setPairs(list => [p, ...(list ?? []).filter(x => x.id !== p.id)].sort((a, b) => b.date.localeCompare(a.date)))
    // The marker clears itself once the site has had time to rebuild.
    setGoing(g => ({ ...g, [p.id]: true }))
    setTimeout(() => setGoing(g => {
      const next = { ...g }
      delete next[p.id]
      return next
    }), LIVE_AFTER_MS)
    setToast(`Published ${p.title}. Live in about two minutes.`)
  }
  const removePair = async (p: ABTrack) => {
    try {
      await apiFetch(`/ab/${p.id}`, { method: 'DELETE' })
      setPairs(list => (list ?? []).filter(x => x.id !== p.id))
      setToast(`Removed ${p.title}. Gone from the site in about two minutes.`)
      setOpen(null)
    } catch (e) {
      fail(e)
    }
  }
  const deleteMessage = async (m: Enquiry) => {
    try {
      await apiFetch(`/messages/${m.id}`, { method: 'DELETE' })
      setMessages(list => (list ?? []).filter(x => x.id !== m.id))
      setOpen(null)
    } catch (e) {
      fail(e)
    }
  }
  const openMessage = (m: Enquiry) => {
    markRead(m.id)
    setOpen({ kind: 'message', message: m })
  }

  return (
    <div className="relative min-h-svh overflow-x-clip bg-scarf-deep pb-28 text-ink-soft md:pb-16">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(70%_100%_at_50%_0%,var(--color-scarf),transparent_75%)]" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pt-8 sm:px-8 md:grid-cols-[208px_minmax(0,1fr)] md:pt-10 lg:gap-16">
        <aside className="md:sticky md:top-10 md:self-start">
          <div className="flex items-center justify-between md:block">
            <Link to="/" className="font-display text-lg tracking-[0.22em] text-ink">RICEY</Link>
            <button type="button" onClick={onSignOut} className="eyebrow min-h-11 text-white/55 hover:text-ink md:hidden">Sign out</button>
          </div>
          <nav aria-label="Sections" className="mt-12 hidden flex-col gap-0.5 md:flex">
            {NAV.map(({ id, label, Icon }) => {
              const on = section === id
              return (
                <button key={id} type="button" aria-current={on ? 'page' : undefined} onClick={() => setSection(id)} className={cn('flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-left text-[0.95rem] transition-colors', on ? 'bg-white/[0.07] text-ink' : 'text-white/60 hover:bg-white/[0.035] hover:text-ink')}>
                  <Icon size={19} weight={on ? 'regular' : 'light'} aria-hidden />
                  <span className="flex-1">{label}</span>
                  {id === 'inbox' && unread.length > 0 && <span className="rounded-full bg-scarf-text px-2 py-0.5 font-mono text-[0.62rem] text-black">{unread.length}</span>}
                </button>
              )
            })}
          </nav>
          <div className="mt-10 hidden flex-col gap-1 border-t border-white/[0.07] pt-6 md:flex">
            <Link to="/" className="flex min-h-10 items-center gap-2 px-3.5 text-sm text-white/50 hover:text-ink">View the site <ArrowUpRight size={14} aria-hidden /></Link>
            <button type="button" onClick={onSignOut} className="flex min-h-10 items-center px-3.5 text-left text-sm text-white/50 hover:text-ink">Sign out</button>
          </div>
        </aside>

        <main className="min-w-0">
          {error && (
            <p role="alert" className="mb-8 flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
              <span className="flex-1">{error}</span>
              <button type="button" aria-label="Dismiss" onClick={() => setError('')} className="text-red-200/70 hover:text-red-100"><X size={15} aria-hidden /></button>
            </p>
          )}

          {section === 'home' && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <p className="eyebrow mb-3 text-white/45">{today()}</p>
                  <h1 className="font-heading text-[clamp(2.6rem,5.5vw,3.8rem)] leading-none text-ink">{greeting()}</h1>
                </div>
                <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-2 sm:flex sm:w-auto">
                  <Pill className="whitespace-nowrap px-5" onClick={() => setOpen({ kind: 'new-credit' })}><Plus size={14} weight="bold" aria-hidden />Credit</Pill>
                  <Pill solid className="whitespace-nowrap px-5" onClick={() => setOpen({ kind: 'new-pair' })}><Plus size={14} weight="bold" aria-hidden />Before / After</Pill>
                </div>
              </div>

              <section className="mt-10" aria-label="New messages">
                {messages === null ? (
                  <p className="text-sm text-white/50">Loading messages…</p>
                ) : unread.length ? (
                  <>
                    <div className="mb-3 flex items-baseline justify-between">
                      <p className="eyebrow text-white/50">{unread.length} new {unread.length === 1 ? 'message' : 'messages'}</p>
                      <button type="button" onClick={() => setSection('inbox')} className="min-h-11 text-sm text-white/55 hover:text-ink">Inbox</button>
                    </div>
                    <MessageList messages={unread} isRead={isRead} onOpen={openMessage} />
                  </>
                ) : (
                  <p className="glass rounded-2xl px-5 py-4 text-sm text-white/60">Inbox clear. Nothing waiting for a reply.</p>
                )}
              </section>

              <section className="glass mt-6 grid grid-cols-3 divide-x divide-white/[0.08] rounded-2xl" aria-label="Overview">
                {([['Credits', credits?.length ?? SEED.length, 'credits'], ['Before / Afters', pairs?.length ?? 0, 'ab'], ['Messages', messages?.length ?? 0, 'inbox']] as const).map(([label, n, to]) => (
                  <button key={label} type="button" onClick={() => setSection(to)} className="flex flex-col items-start px-4 py-4 text-left transition-colors hover:bg-white/[0.03] sm:px-6 sm:py-5">
                    <span className="font-heading text-[2rem] leading-none text-ink sm:text-[2.6rem]">{n}</span>
                    <span className="mt-2 text-xs text-white/50 sm:text-sm">{label}</span>
                  </button>
                ))}
              </section>

              <div className="mt-12 grid gap-10 lg:grid-cols-2">
                <section>
                  <SubHead title="Latest credits" more={`All ${allCredits.length}`} onMore={() => setSection('credits')} />
                  <ul className="divide-y divide-white/[0.07] border-t border-white/[0.07]">
                    {allCredits.slice(0, 4).map(c => (
                      <li key={c.id}><ReleaseRow credit={c} hasPair={!!pairFor(c)} onClick={() => setOpen({ kind: 'release', credit: c, tab: 'details' })} /></li>
                    ))}
                  </ul>
                </section>
                <section>
                  <SubHead title="Before / After" more={pairs ? `All ${pairs.length}` : ''} onMore={() => setSection('ab')} />
                  <ul className="divide-y divide-white/[0.07] border-t border-white/[0.07]">
                    {(pairs ?? []).slice(0, 4).map(p => (
                      <li key={p.id}>
                        <button type="button" onClick={() => openPair(p)} className="flex w-full items-center gap-4 py-3 text-left hover:bg-white/[0.025]">
                          <Art src={p.art} className="h-11 w-11 rounded-md" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-heading text-[1.15rem] leading-tight text-ink">{p.title}</span>
                            <span className="mt-0.5 block truncate font-mono text-[0.56rem] uppercase tracking-[0.18em] text-scarf-text">{p.mode} · {fmt(p.duration)}</span>
                          </span>
                          {isGoing(p.id) ? <GoingLive /> : <CaretRight size={14} className="text-white/30" aria-hidden />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          )}

          {section === 'inbox' && (
            <>
              <Head title="Inbox" sub={messages === null ? 'Loading…' : unread.length ? `${unread.length} new` : 'All read'} />
              {messages && <MessageList messages={messages} isRead={isRead} onOpen={openMessage} empty="No messages yet. Tracks sent from the Contact page land here." />}
            </>
          )}

          {section === 'credits' && (
            <Credits
              credits={credits}
              pairFor={pairFor}
              onOpen={c => setOpen({ kind: 'release', credit: c, tab: 'details' })}
              onAdd={() => setOpen({ kind: 'new-credit' })}
              onImport={list => saveCredits(list).then(() => setToast('Imported')).catch(fail)}
            />
          )}

          {section === 'ab' && (
            <>
              <Head title="Before / After" sub={pairs ? `${pairs.length} on the site` : 'Loading…'} action={<Pill solid onClick={() => setOpen({ kind: 'new-pair' })}><Plus size={14} weight="bold" aria-hidden />Add</Pill>} />
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
                {(pairs ?? []).map(p => (
                  <button key={p.id} type="button" onClick={() => openPair(p)} className="group text-left">
                    <span className="relative block overflow-hidden rounded-xl">
                      <Art src={p.art} className="aspect-square w-full transition-transform duration-500 group-hover:scale-[1.03]" />
                      {isGoing(p.id) && <GoingLive className="absolute left-2 top-2" />}
                    </span>
                    <span className="mt-3 block truncate font-heading text-[1.2rem] leading-tight text-ink">{p.title}</span>
                    <span className="mt-1 block truncate font-mono text-[0.58rem] uppercase tracking-[0.18em] text-scarf-text">{p.mode} · {fmt(p.duration)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Phone: the sections as a tab bar. */}
      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-white/[0.08] bg-[rgba(6,11,33,0.88)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {NAV.map(({ id, short, Icon }) => {
          const on = section === id
          return (
            <button key={id} type="button" onClick={() => setSection(id)} aria-current={on ? 'page' : undefined} className={cn('relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[0.68rem]', on ? 'text-ink' : 'text-white/50')}>
              <Icon size={22} weight={on ? 'regular' : 'light'} aria-hidden />
              {short}
              {id === 'inbox' && unread.length > 0 && <span className="absolute left-[calc(50%+8px)] top-2.5 h-2 w-2 rounded-full bg-scarf-text" />}
            </button>
          )
        })}
      </nav>

      {open && (
        <Opened
          key={open.kind === 'release' ? `r-${open.credit.id}` : open.kind === 'message' ? `m-${open.message.id}` : open.kind === 'pair' ? `p-${open.pair.id}` : open.kind}
          open={open}
          credits={allCredits}
          pairFor={pairFor}
          isGoing={isGoing}
          onClose={() => setOpen(null)}
          onSaveCredit={upsertCredit}
          onDeleteCredit={deleteCredit}
          onPublished={published}
          onRemovePair={removePair}
          onDeleteMessage={deleteMessage}
          onError={fail}
        />
      )}

      {toast && (
        <div role="status" className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-white/15 bg-black/85 px-5 py-3 text-sm text-ink shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur md:bottom-8">
          {toast}
        </div>
      )}
    </div>
  )
}

// What's open in the drawer: a release (its details and its before / after), a message, or
// one of the two add flows.
function Opened({ open, credits, pairFor, isGoing, onClose, onSaveCredit, onDeleteCredit, onPublished, onRemovePair, onDeleteMessage, onError }: {
  open: NonNullable<Open>
  credits: Credit[]
  pairFor: (c: Credit) => ABTrack | undefined
  isGoing: (id: string) => boolean
  onClose: () => void
  onSaveCredit: (c: Credit) => Promise<void>
  onDeleteCredit: (c: Credit) => Promise<void>
  onPublished: (p: ABTrack) => void
  onRemovePair: (p: ABTrack) => Promise<void>
  onDeleteMessage: (m: Enquiry) => Promise<void>
  onError: (e: unknown) => void
}) {
  const [tab, setTab] = useState<'details' | 'ab'>(open.kind === 'release' ? open.tab : 'details')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const run = (fn: () => Promise<void>) => {
    setBusy(true)
    fn().finally(() => setBusy(false))
  }

  if (open.kind === 'new-credit') {
    return (
      <Drawer eyebrow="New" title="Add a credit" onClose={onClose}>
        <CreditForm bare onSave={onSaveCredit} onCancel={onClose} />
      </Drawer>
    )
  }
  if (open.kind === 'new-pair') {
    return (
      <Drawer eyebrow="New" title="Add a before / after" onClose={onClose}>
        <AddPair credits={credits} onCancel={onClose} onPublished={p => { onPublished(p); onClose() }} onError={onError} />
      </Drawer>
    )
  }
  if (open.kind === 'message') {
    const m = open.message
    return (
      <Drawer
        eyebrow={`${m.service} · ${when(m.at)}`}
        title={m.track}
        onClose={onClose}
        footer={confirm ? (
          <Confirm text="Delete this message?" action="Delete" busy={busy} onKeep={() => setConfirm(false)} onConfirm={() => run(() => onDeleteMessage(m))} />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.track}`)}`} className="inline-flex min-h-11 items-center rounded-full bg-ink px-6 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-black hover:bg-white">Reply</a>
            <button type="button" onClick={() => setConfirm(true)} className="min-h-11 px-2 text-sm text-red-300/80 hover:text-red-200">Delete</button>
          </div>
        )}
      >
        <MessageView m={m} />
      </Drawer>
    )
  }

  // A release, or a pair whose credit is gone.
  const credit = open.kind === 'release' ? credits.find(c => c.id === open.credit.id) ?? open.credit : null
  const pair = open.kind === 'pair' ? open.pair : credit ? pairFor(credit) : undefined
  const showAb = open.kind === 'pair' || tab === 'ab'
  const title = credit?.title ?? pair!.title
  return (
    <Drawer
      eyebrow={credit?.artist ?? pair!.artist}
      title={title}
      art={credit?.art ?? pair?.art}
      onClose={onClose}
      tabs={credit && (
        <div role="tablist" aria-label="Release" className="inline-flex rounded-full bg-black/40 p-1">
          {([['details', 'Details'], ['ab', pair ? 'Before / After' : 'Add before / after']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setConfirm(false); setReplacing(false) }} className={cn('min-h-10 rounded-full px-4 text-sm transition-colors', tab === id ? 'bg-ink text-black' : 'text-white/65 hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
      )}
      footer={confirm ? (
        showAb && pair ? (
          <Confirm text={`Remove the before / after for ${title}?`} action="Remove" busy={busy} onKeep={() => setConfirm(false)} onConfirm={() => run(() => onRemovePair(pair))} />
        ) : credit ? (
          <Confirm text={`Delete ${title}?`} action="Delete" busy={busy} onKeep={() => setConfirm(false)} onConfirm={() => run(() => onDeleteCredit(credit))} />
        ) : undefined
      ) : undefined}
    >
      {!showAb && credit && (
        <>
          <CreditForm bare initial={credit} onSave={onSaveCredit} onCancel={onClose} onDelete={() => setConfirm(true)} />
          <p className="mt-6 flex flex-wrap gap-x-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-white/35">
            On the site as {sortRoles(credit.roles).join(' · ')}
          </p>
        </>
      )}
      {showAb && (pair && !replacing ? (
        <div className="space-y-6">
          <p className="flex items-center gap-2 text-sm text-white/60">
            {isGoing(pair.id) ? <GoingLive /> : <><span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80" />On the site · {pair.mode}</>}
          </p>
          <ABPlayer src={pair.src} lufs={pair.lufs} peaks={pair.peaks} />
          <dl className="grid gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4"><dt className="text-white/50">Length</dt><dd className="text-ink">{fmt(pair.duration)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-white/50">Loudness</dt><dd className="text-ink">{pair.lufs.before} → {pair.lufs.after} LUFS</dd></div>
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            {credit && <Pill onClick={() => setReplacing(true)}>Replace files</Pill>}
            <button type="button" onClick={() => setConfirm(true)} className="min-h-11 px-2 text-sm text-red-300/80 hover:text-red-200">Remove from the site</button>
          </div>
        </div>
      ) : credit ? (
        <AddPair
          credits={credits}
          initialId={credit.id}
          fixed
          onCancel={() => (replacing ? setReplacing(false) : onClose())}
          onPublished={p => { onPublished(p); setReplacing(false) }}
          onError={onError}
        />
      ) : null)}
    </Drawer>
  )
}

function Credits({ credits, pairFor, onOpen, onAdd, onImport }: {
  credits: Credit[] | null
  pairFor: (c: Credit) => ABTrack | undefined
  onOpen: (c: Credit) => void
  onAdd: () => void
  onImport: (list: Credit[]) => void
}) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const all = credits ?? []
    return s ? all.filter(c => `${c.title} ${c.artist} ${c.roles.join(' ')}`.toLowerCase().includes(s)) : all
  }, [q, credits])
  const ids = new Set((credits ?? []).map(c => c.id))
  const missing = SEED.filter(s => !ids.has(s.id))

  return (
    <>
      <Head title="Credits" sub={credits ? `${credits.length} on the site` : 'Loading…'} action={<Pill solid onClick={onAdd}><Plus size={14} weight="bold" aria-hidden />Add</Pill>} />
      {credits && credits.length === 0 ? (
        <div className="glass rounded-2xl p-6">
          <p className="mb-5 text-white/75">No credits stored yet. The public page is showing the {SEED.length} built-in ones.</p>
          <Pill solid onClick={() => onImport(SEED)}>Import the {SEED.length} built-in credits</Pill>
        </div>
      ) : credits && (
        <>
          {missing.length > 0 && (
            <div className="glass mb-6 rounded-2xl p-5">
              <p className="mb-4 text-sm text-white/80">
                {missing.length} built-in {missing.length === 1 ? 'credit isn’t' : 'credits aren’t'} in your list yet: <span className="text-ink">{missing.map(m => m.title).join(', ')}</span>
              </p>
              <Pill solid onClick={() => onImport([...credits, ...missing])}>Add {missing.length === 1 ? 'it' : `all ${missing.length}`}</Pill>
            </div>
          )}
          <label className="glass mb-6 flex min-h-12 items-center gap-3 rounded-full px-5">
            <MagnifyingGlass size={17} className="text-white/45" aria-hidden />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a title, artist or role" aria-label="Find a credit" className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-white/35 focus:outline-none" />
            {q && <button type="button" aria-label="Clear" onClick={() => setQ('')} className="text-white/50 hover:text-ink"><X size={15} aria-hidden /></button>}
          </label>
          {list.length === 0 ? (
            <p className="text-white/55">Nothing matches &ldquo;{q}&rdquo;.</p>
          ) : (
            <ul className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {list.map(c => (
                <li key={c.id}><ReleaseRow credit={c} hasPair={!!pairFor(c)} onClick={() => onOpen(c)} roles /></li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}

function Head({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {sub && <p className="eyebrow mb-3 text-white/45">{sub}</p>}
        <h1 className="font-heading text-[clamp(2.4rem,5vw,3.4rem)] leading-none text-ink">{title}</h1>
      </div>
      {action}
    </div>
  )
}

function SubHead({ title, more, onMore }: { title: string; more: string; onMore: () => void }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="font-heading text-[1.7rem] leading-none text-ink">{title}</h2>
      {more && <button type="button" onClick={onMore} className="min-h-11 text-sm text-white/55 hover:text-ink">{more}</button>}
    </div>
  )
}

function Art({ src, className }: { src?: string; className?: string }) {
  return src ? <img src={src} alt="" loading="lazy" className={cn('shrink-0 object-cover', className)} /> : <span className={cn('block shrink-0 bg-scarf', className)} />
}

function ReleaseRow({ credit, hasPair, onClick, roles }: { credit: Credit; hasPair: boolean; onClick: () => void; roles?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 py-3 text-left hover:bg-white/[0.025]">
      <Art src={credit.art} className="h-11 w-11 rounded-md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-heading text-[1.15rem] leading-tight text-ink">{credit.title}</span>
        <span className="mt-0.5 block truncate text-sm text-white/55">{credit.artist}</span>
        {roles && (
          <span className="mt-1 flex flex-wrap gap-x-3 font-mono text-[0.56rem] uppercase tracking-[0.18em] text-scarf-text">
            {sortRoles(credit.roles).map(r => <span key={r}>{r}</span>)}
          </span>
        )}
      </span>
      {hasPair && <span title="Has a before / after" className="shrink-0 rounded-full border border-white/15 px-2 py-0.5 font-mono text-[0.55rem] tracking-[0.12em] text-white/55">B / A</span>}
      <CaretRight size={14} className="shrink-0 text-white/30" aria-hidden />
    </button>
  )
}

function GoingLive({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-ink backdrop-blur', className)}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-scarf-text" />
      Going live
    </span>
  )
}
