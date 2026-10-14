import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../lib/api'
import { MODES, fmt, type ABTrack, type Mode } from '../../lib/ab'
import type { Credit } from '../../lib/credits'
import { cn } from '../../lib/utils'
import { Pill } from '../../components/Pill'
import { ABPlayer } from './ABPlayer'
import { processPair, type Processed, type Step } from './processPair'

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
      className={cn('glass flex min-h-32 cursor-pointer flex-col justify-center rounded-2xl border border-dashed p-5 transition-colors', over ? 'border-ink' : file ? 'border-scarf-text/60' : 'border-white/20 hover:border-white/45')}
    >
      <span className="font-heading text-2xl text-ink">{label}</span>
      <span className="mt-1 text-sm text-white/55">{hint}</span>
      <span className={cn('mt-3 truncate text-sm', file ? 'text-ink' : 'text-white/40')}>
        {file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : 'Drop a WAV here, or click to choose'}
      </span>
      <input type="file" accept="audio/*,.wav,.aif,.aiff" className="sr-only" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
    </label>
  )
}

// Adding (or replacing) a before / after: release, comparison, two bounces, Prepare (all in the
// browser), listen, Publish. `fixed` hides the release picker when it was opened from a release.
export function AddPair({ credits, initialId, fixed, onCancel, onPublished, onError }: {
  credits: Credit[]
  initialId?: string
  fixed?: boolean
  onCancel: () => void
  onPublished: (pair: ABTrack) => void
  onError: (e: unknown) => void
}) {
  const [creditId, setCreditId] = useState(initialId ?? '')
  const credit = credits.find(c => c.id === creditId)
  const [mode, setMode] = useState<Mode>(() => (credit ? defaultMode(credit.roles) : 'Mastering'))
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
      const saved = await apiFetch<{ id: string; entry: Omit<ABTrack, 'id'> }>('/ab', {
        method: 'POST',
        body: JSON.stringify({
          entry: { title: credit.title, artist: credit.artist, art: credit.art, date: credit.date, mode, lufs: result.lufs, duration: result.duration, peaks: result.peaks },
          blobs: { before: before.sha, after: after.sha },
        }),
      })
      onPublished({ ...saved.entry, id: saved.id })
    } catch (e) {
      setPublishing('')
      onError(e)
    }
  }

  const sorted = useMemo(() => [...credits].sort((a, b) => a.title.localeCompare(b.title)), [credits])
  const busy = !!step || !!publishing
  const showPicker = !(fixed && credit)

  return (
    <div>
      {showPicker && (
        <>
          <label className="block text-sm text-white/70">
            Release
            <select value={creditId} onChange={e => pick(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-ink focus:border-white/50 focus:outline-none">
              <option value="">Choose from your credits</option>
              {sorted.map(c => <option key={c.id} value={c.id}>{c.title} · {c.artist}</option>)}
            </select>
          </label>
          <p className="mt-2 text-xs text-white/45">Not listed? Add it as a credit first.</p>
        </>
      )}

      <fieldset className={cn(showPicker && 'mt-6')}>
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
        Bounce the same section of the track for both, 1 to 2 minutes. They&rsquo;re lined up, turned down together so neither clips, and made into MP3s here in your browser.
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

      {result && credit && <Preview result={result} />}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {result ? (
          <Pill solid onClick={publish} disabled={busy || !credit}>{publishing ? `${publishing}…` : 'Publish to the site'}</Pill>
        ) : (
          <Pill solid onClick={prepare} disabled={busy || !credit || !files.before || !files.after}>{step ? 'Preparing…' : 'Prepare'}</Pill>
        )}
        <Pill onClick={onCancel} disabled={!!publishing}>Cancel</Pill>
        {!result && !busy && (!credit || !files.before || !files.after) && <span className="text-sm text-white/40">{credit ? 'Add both files' : 'Choose a release and both files'}</span>}
      </div>
    </div>
  )
}

// Hear the prepared clips before publishing.
function Preview({ result }: { result: Processed }) {
  const src = useMemo(() => ({ before: URL.createObjectURL(result.files.before), after: URL.createObjectURL(result.files.after) }), [result])
  useEffect(() => () => { URL.revokeObjectURL(src.before); URL.revokeObjectURL(src.after) }, [src])
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-5 sm:p-6">
      <ABPlayer src={src} lufs={result.lufs} peaks={result.peaks} />
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
