import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthError, apiFetch } from '../../lib/api'
import { AB_TRACKS, MODES, fmt, toTracks, type ABTrack, type Mode } from '../../lib/ab'
import { useABEngine } from '../../lib/abEngine'
import type { Credit } from '../../lib/credits'
import { cn } from '../../lib/utils'
import { Pill } from '../../components/Pill'
import { PlayButton, Volume, Wave } from '../../components/Playback'
import { processPair, type Processed, type Step } from './processPair'

type Stored = Record<string, Omit<ABTrack, 'id'>>

const defaultMode = (roles: string[]): Mode => {
  const mix = roles.includes('Mixing'), master = roles.includes('Mastering')
  return mix && master ? 'Mixing & mastering' : mix ? 'Mixing' : 'Mastering'
}

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''))
    r.onerror = () => reject(new Error('Couldn’t read the clip'))
    r.readAsDataURL(blob)
  })

// The Before / After tab: what's on the site, and adding a pair from two bounces.
export function ABAdmin({ credits, onAuthError }: { credits: Credit[]; onAuthError: () => void }) {
  const [stored, setStored] = useState<ABTrack[] | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)

  const fail = useCallback((e: unknown) => {
    if (e instanceof AuthError) onAuthError()
    else setError((e as Error).message)
  }, [onAuthError])

  const load = useCallback(() => {
    apiFetch<Stored>('/ab')
      .then(d => setStored(toTracks(d)))
      .catch(e => {
        // Not set up yet: show what the site was built with.
        setStored(AB_TRACKS)
        fail(e)
      })
  }, [fail])

  useEffect(load, [load])

  const remove = async (t: ABTrack) => {
    if (!window.confirm(`Remove the before / after for “${t.title}”? The clips are deleted from the site.`)) return
    try {
      setError('')
      await apiFetch(`/ab/${t.id}`, { method: 'DELETE' })
      setNotice(`Removed ${t.title}. The site updates in about two minutes.`)
      load()
    } catch (e) {
      fail(e)
    }
  }

  return (
    <div>
      {notice && <p role="status" className="mb-6 rounded-xl border border-scarf-text/30 bg-scarf/40 p-4 text-sm text-ink">{notice}</p>}
      {error && <p role="alert" className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}

      {adding ? (
        <AddPair
          credits={credits}
          onCancel={() => setAdding(false)}
          onPublished={title => {
            setAdding(false)
            setNotice(`Published ${title}. The site updates in about two minutes.`)
            load()
          }}
          onError={fail}
        />
      ) : (
        <div className="mb-8 flex flex-wrap gap-3">
          <Pill solid onClick={() => { setError(''); setNotice(''); setAdding(true) }}>Add a before / after</Pill>
          <Pill to="/before-after">View the page</Pill>
        </div>
      )}

      {stored === null ? (
        <p className="mt-8 text-white/60">Loading…</p>
      ) : (
        <ul className="mt-8 divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {stored.map(t => (
            <li key={t.id} className="flex items-center gap-4 py-3">
              {t.art ? <img src={t.art} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" /> : <span className="h-14 w-14 shrink-0 rounded-md bg-scarf" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-xl leading-tight text-ink">{t.title}</p>
                <p className="truncate text-sm text-white/60">{t.artist}</p>
                <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-scarf-text">
                  {t.mode} · {fmt(t.duration)}
                </p>
              </div>
              <button type="button" onClick={() => remove(t)} className="min-h-11 px-2 text-sm text-red-300/80 hover:text-red-200">Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Drop({ label, hint, file, onFile }: { label: string; hint: string; file: File | null; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false)
  return (
    <label
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
      className={cn('glass flex min-h-36 cursor-pointer flex-col justify-center rounded-2xl border border-dashed p-5 transition-colors', over ? 'border-ink' : 'border-white/20 hover:border-white/45')}
    >
      <span className="font-heading text-2xl text-ink">{label}</span>
      <span className="mt-1 text-sm text-white/55">{hint}</span>
      <span className={cn('mt-4 truncate text-sm', file ? 'text-ink' : 'text-white/40')}>
        {file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : 'Drop a WAV here, or click to choose'}
      </span>
      <input type="file" accept="audio/*,.wav,.aif,.aiff" className="sr-only" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
    </label>
  )
}

function AddPair({ credits, onCancel, onPublished, onError }: { credits: Credit[]; onCancel: () => void; onPublished: (title: string) => void; onError: (e: unknown) => void }) {
  const [creditId, setCreditId] = useState('')
  const credit = credits.find(c => c.id === creditId)
  const [mode, setMode] = useState<Mode>('Mastering')
  const [files, setFiles] = useState<{ before: File | null; after: File | null }>({ before: null, after: null })
  const [step, setStep] = useState<Step | null>(null)
  const [result, setResult] = useState<Processed | null>(null)
  const [problem, setProblem] = useState('')
  const [publishing, setPublishing] = useState('')

  const pick = (id: string) => {
    setCreditId(id)
    const c = credits.find(x => x.id === id)
    if (c) setMode(defaultMode(c.roles))
  }
  const setFile = (v: 'before' | 'after', f: File) => {
    setFiles(x => ({ ...x, [v]: f }))
    setResult(null)
  }

  const prepare = async () => {
    if (!files.before || !files.after) return
    setProblem('')
    setResult(null)
    try {
      setResult(await processPair({ before: files.before, after: files.after }, setStep))
    } catch (e) {
      setProblem((e as Error).message)
    } finally {
      setStep(null)
    }
  }

  const publish = async () => {
    if (!credit || !result) return
    try {
      setPublishing('Uploading the before clip')
      const before = await apiFetch<{ sha: string }>('/ab/blob', { method: 'POST', body: JSON.stringify({ content: await toBase64(result.files.before), encoding: 'base64' }) })
      setPublishing('Uploading the after clip')
      const after = await apiFetch<{ sha: string }>('/ab/blob', { method: 'POST', body: JSON.stringify({ content: await toBase64(result.files.after), encoding: 'base64' }) })
      setPublishing('Publishing')
      await apiFetch('/ab', {
        method: 'POST',
        body: JSON.stringify({
          entry: { title: credit.title, artist: credit.artist, art: credit.art, date: credit.date, mode, lufs: result.lufs, duration: result.duration, peaks: result.peaks },
          blobs: { before: before.sha, after: after.sha },
        }),
      })
      onPublished(credit.title)
    } catch (e) {
      setPublishing('')
      onError(e)
    }
  }

  const sorted = useMemo(() => [...credits].sort((a, b) => a.title.localeCompare(b.title)), [credits])
  const busy = !!step || !!publishing

  return (
    <section className="glass mb-10 rounded-3xl p-6 sm:p-8">
      <h2 className="font-heading text-[2.2rem] leading-none text-ink">Add a before / after</h2>

      <label className="mt-8 block text-sm text-white/70">
        Release
        <select value={creditId} onChange={e => pick(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-ink focus:border-white/50 focus:outline-none">
          <option value="">Choose from your credits</option>
          {sorted.map(c => <option key={c.id} value={c.id}>{c.title} · {c.artist}</option>)}
        </select>
      </label>
      <p className="mt-2 text-xs text-white/45">Not listed? Add it on the Credits tab first.</p>

      <fieldset className="mt-6">
        <legend className="text-sm text-white/70">Comparison</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {MODES.map(m => (
            <button key={m.mode} type="button" aria-pressed={mode === m.mode} onClick={() => setMode(m.mode)} className={cn('min-h-11 rounded-full border px-5 text-sm transition-colors', mode === m.mode ? 'border-ink bg-ink text-black' : 'border-white/20 text-white/75 hover:border-white/50')}>
              {m.mode}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Drop label="Before" hint={mode === 'Mastering' ? 'The unmastered mix' : 'Unmixed and unmastered'} file={files.before} onFile={f => setFile('before', f)} />
        <Drop label="After" hint={mode === 'Mixing' ? 'The finished mix' : 'The final master'} file={files.after} onFile={f => setFile('after', f)} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-white/45">
        Bounce the same section of the track for both, 1 to 2 minutes. They’re lined up, turned down together so neither clips, and made into MP3s here in your browser.
      </p>

      {step && (
        <div className="mt-6" role="status">
          <p className="text-sm text-white/80">{step.label}…</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div className={cn('h-full bg-ink transition-[width]', step.progress === undefined && 'w-1/3 animate-pulse')} style={step.progress === undefined ? undefined : { width: `${Math.round(step.progress * 100)}%` }} />
          </div>
        </div>
      )}
      {problem && <p role="alert" className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{problem}</p>}

      {result && credit && <Preview result={result} credit={credit} mode={mode} />}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {result ? (
          <Pill solid onClick={publish} disabled={busy || !credit}>{publishing || 'Publish to the site'}</Pill>
        ) : (
          <Pill solid onClick={prepare} disabled={busy || !credit || !files.before || !files.after}>Prepare</Pill>
        )}
        <Pill onClick={onCancel} disabled={!!publishing}>Cancel</Pill>
        {!result && !busy && (!credit || !files.before || !files.after) && <span className="text-sm text-white/40">Choose a release and both files</span>}
      </div>
    </section>
  )
}

// Hear the prepared clips before publishing, with the same controls as the site.
function Preview({ result, credit, mode }: { result: Processed; credit: Credit; mode: Mode }) {
  const urls = useMemo(() => ({ before: URL.createObjectURL(result.files.before), after: URL.createObjectURL(result.files.after) }), [result])
  useEffect(() => () => { URL.revokeObjectURL(urls.before); URL.revokeObjectURL(urls.after) }, [urls])
  const list = useMemo(() => [{ src: urls, lufs: result.lufs }], [urls, result])
  const ab = useABEngine(list)
  const gap = result.lufs.after - result.lufs.before
  const trim = ab.match ? Math.pow(10, -Math.abs(gap) / 20) : 1
  const louder = gap > 0 ? 'after' : 'before'
  const data = result.peaks[ab.version].map(p => (ab.version === louder ? p * trim : p))

  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        {credit.art && <img src={credit.art} alt="" className="h-16 w-16 rounded-lg object-cover" />}
        <div className="min-w-0">
          <p className="eyebrow text-scarf-text">{mode}</p>
          <p className="mt-1 truncate font-heading text-2xl text-ink">{credit.title}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <PlayButton playing={ab.playing} onClick={ab.play} loading={ab.loading} />
        <div role="radiogroup" aria-label="Version" className="inline-flex rounded-full bg-black/40 p-1">
          {(['before', 'after'] as const).map(v => (
            <button key={v} type="button" role="radio" aria-checked={ab.version === v} onClick={() => ab.setVersion(v)} className={cn('min-h-11 min-w-[96px] rounded-full px-5 text-sm capitalize transition-colors', ab.version === v ? 'bg-ink text-black' : 'text-white/70 hover:text-ink')}>
              {v}
            </button>
          ))}
        </div>
        <span className="font-mono text-xs tabular-nums text-white/55">{fmt(ab.time)} / {fmt(ab.dur)}</span>
      </div>
      <Wave data={data} progress={ab.dur ? ab.time / ab.dur : 0} onSeek={ab.seek} className="mt-6" />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-white/80">
          <input type="checkbox" checked={ab.match} onChange={e => ab.setMatch(e.target.checked)} className="h-4 w-4 accent-ink" />
          Level match
        </label>
        <Volume value={ab.vol} onChange={ab.setVol} />
      </div>
      <dl className="mt-5 grid gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-4"><dt className="text-white/50">Length</dt><dd className="text-ink">{fmt(result.duration)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-white/50">Lined up</dt><dd className="text-ink">{result.offsetMs === 0 ? 'Already in time' : `Moved ${Math.abs(result.offsetMs)} ms`}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-white/50">Loudness</dt><dd className="text-ink">{result.lufs.before} → {result.lufs.after} LUFS</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-white/50">Turned down</dt><dd className="text-ink">{result.gainDb === 0 ? 'Not needed' : `${Math.abs(result.gainDb)} dB, both`}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-white/50">Peaks</dt><dd className="text-ink">{result.truePeak.before} / {result.truePeak.after} dBTP</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-white/50">Size</dt><dd className="text-ink">{((result.files.before.size + result.files.after.size) / 1048576).toFixed(1)} MB</dd></div>
      </dl>
    </div>
  )
}
