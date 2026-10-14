// Turns the before/after WAVs into what the Before / After page plays.
//
//   node scripts/ab-encode.mjs "C:/Users/phaseman42/Documents/Ricey AB"
//
// For each release it finds the two WAVs (anywhere under the folder), checks they line up,
// trims both to the shorter length, encodes MP3s to public/audio/ab/, measures integrated
// loudness (EBU R128) for Level match, and draws a waveform. The results go to
// src/data/ab-tracks.json, keyed by the release title on the Credits page.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const SRC = process.argv[2]
if (!SRC) throw new Error('Pass the folder with the WAVs')
const OUT_AUDIO = 'public/audio/ab'
const OUT_DATA = 'src/data/ab-tracks.json'
const BINS = 160
const RATE = 11025 // analysis rate for alignment and waveform; the MP3s keep the source rate

// Release titles as they appear in src/data/credits.json, matched loosely against file names.
const TITLES = ['The One', 'Resonating', 'MAKE IT THROUGH', 'Ms Westminster', 'I KNOW', 'TAMO', 'The Truth', 'Too Clever by Half', 'Anemoia']
const key = s => s.toLowerCase().replace(/^ms /, '').replace(/[^a-z]/g, '')
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const walk = d => readdirSync(d).flatMap(f => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
const wavs = walk(SRC).filter(f => /\.wav$/i.test(f))

const versionOf = f => {
  const n = basename(f).toLowerCase()
  if (/unmixed|unmastered|\braw\b/.test(n)) return 'before'
  if (/mastered|mixed/.test(n)) return 'after'
  throw new Error(`Can't tell before or after: ${f}`)
}
const titleOf = f => {
  const n = key(basename(f))
  // Allow one typo (e.g. "Westiminster") by also trying the name with each letter dropped.
  const hit = TITLES.find(t => n.includes(key(t))) ?? TITLES.find(t => [...n].some((_, i) => (n.slice(0, i) + n.slice(i + 1)).includes(key(t))))
  if (!hit) throw new Error(`No release matches: ${f}`)
  return hit
}

const pcm = (f, extra = []) => {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', f, ...extra, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 })
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4)
}
// ffmpeg prints the ebur128 summary on stderr.
const loudness = f => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' })
  const summary = r.stderr.slice(r.stderr.lastIndexOf('Summary:'))
  const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1])
  const peak = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1])
  return { I, peak }
}

// Offset of b against a, in seconds, from the cross-correlation of their energy envelopes over
// the first 20 s. Positive means b starts later.
const offset = (a, b) => {
  const hop = 64
  const env = x => {
    const n = Math.min(x.length, RATE * 20) / hop | 0
    const e = new Float32Array(n)
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < hop; j++) s += x[i * hop + j] ** 2; e[i] = Math.sqrt(s / hop) }
    const m = e.reduce((p, v) => p + v, 0) / n
    return e.map(v => v - m)
  }
  const ea = env(a), eb = env(b)
  const max = Math.round(0.5 * RATE / hop)
  let best = 0, bestLag = 0
  for (let lag = -max; lag <= max; lag++) {
    let s = 0
    for (let i = 0; i < ea.length; i++) { const j = i + lag; if (j >= 0 && j < eb.length) s += ea[i] * eb[j] }
    if (s > best) { best = s; bestLag = lag }
  }
  return (bestLag * hop) / RATE
}

const rmsBins = x => {
  const size = x.length / BINS
  return Array.from({ length: BINS }, (_, i) => {
    let s = 0
    const a = Math.floor(i * size), b = Math.floor((i + 1) * size)
    for (let j = a; j < b; j++) s += x[j] * x[j]
    return Math.sqrt(s / Math.max(1, b - a))
  })
}

const groups = {}
for (const f of wavs) (groups[titleOf(f)] ??= {})[versionOf(f)] = f

mkdirSync(OUT_AUDIO, { recursive: true })
const data = {}
for (const title of TITLES) {
  const g = groups[title]
  if (!g?.before || !g?.after) { console.log(`skip ${title}: missing ${!g?.before ? 'before' : 'after'}`); continue }
  const a = pcm(g.before), b = pcm(g.after)
  const off = offset(a, b)
  // Trim the later-starting file so both begin together, then cut both to the shorter length.
  const startB = Math.max(0, off), startA = Math.max(0, -off)
  const len = Math.min(a.length / RATE - startA, b.length / RATE - startB)
  const files = {}
  const peaks = {}
  const loud = {}
  for (const [v, f, start] of [['before', g.before, startA], ['after', g.after, startB]]) {
    const out = `${OUT_AUDIO}/${slug(title)}-${v}.mp3`
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(start), '-t', String(len), '-i', f, '-c:a', 'libmp3lame', '-q:a', '2', '-map_metadata', '-1', out])
    files[v] = '/' + out.replace(/^public\//, '')
    loud[v] = loudness(out)
    peaks[v] = rmsBins(pcm(out))
  }
  // Normalise both waveforms to the louder of the pair, so the quieter version looks quieter.
  const top = Math.max(...peaks.before, ...peaks.after)
  for (const v of ['before', 'after']) peaks[v] = peaks[v].map(p => Math.round((p / top) * 1000) / 1000)
  data[title] = { src: files, lufs: { before: loud.before.I, after: loud.after.I }, peaks, duration: Math.round(len * 100) / 100 }
  console.log(`${title.padEnd(20)} offset ${(off * 1000).toFixed(0).padStart(4)} ms  ${len.toFixed(1)} s  LUFS ${loud.before.I} → ${loud.after.I}  peak ${loud.before.peak} / ${loud.after.peak} dBFS`)
}
writeFileSync(OUT_DATA, JSON.stringify(data) + '\n')
console.log(`wrote ${OUT_DATA}`)
