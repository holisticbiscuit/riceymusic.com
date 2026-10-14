import { useCallback, useEffect, useRef, useState } from 'react'

export type Version = 'before' | 'after'
export type ABSource = { src: Record<Version, string>; lufs: Record<Version, number> }

// One AudioContext for the page. It can decode while suspended, and resumes on the first play.
let ctx: AudioContext | null = null
const audio = () => (ctx ??= new AudioContext())

// Downloaded MP3s (a few MB each) are kept for the visit, so clips fetched ahead of time are
// ready when picked. Decoded audio is about 40 MB per two-minute clip, so only the current
// pair and the one after it stay decoded.
const bytes = new Map<string, Promise<ArrayBuffer>>()
const fetchClip = (url: string) => {
  let hit = bytes.get(url)
  if (!hit) {
    hit = fetch(url).then(r => {
      if (!r.ok) throw new Error(`${r.status} ${url}`)
      return r.arrayBuffer()
    })
    hit.catch(() => bytes.delete(url))
    bytes.set(url, hit)
  }
  return hit
}
const decoded = new Map<string, Promise<AudioBuffer>>()
const decode = (url: string) => {
  let hit = decoded.get(url)
  if (!hit) {
    // decodeAudioData takes ownership of its buffer, so it gets a copy.
    hit = fetchClip(url).then(b => audio().decodeAudioData(b.slice(0)))
    hit.catch(() => decoded.delete(url))
    decoded.set(url, hit)
    while (decoded.size > 4) decoded.delete(decoded.keys().next().value!)
  }
  return hit
}

// Decode a pair ahead of time, e.g. when the card that opens it is hovered.
export const warm = (t: ABSource) => {
  Promise.all([decode(t.src.before), decode(t.src.after)]).catch(() => {})
}

// Download clips ahead of time (not decoded), e.g. the first of each comparison.
export const preload = (tracks: ABSource[]) => {
  for (const t of tracks) {
    fetchClip(t.src.before).catch(() => {})
    fetchClip(t.src.after).catch(() => {})
  }
}

const VOLUME_KEY = 'ricey-ab-volume'
const savedVolume = () => {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY))
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.8
  } catch {
    return 0.8
  }
}

// Before and after are decoded in full, then started on the same audio clock, so they stay
// sample-locked with no buffering once loaded. Switching crossfades over a few milliseconds
// and keeps your place. Level match turns the louder version down by the measured LUFS gap,
// so the work is judged on tone and punch rather than on loudness alone.
export function useABEngine<T extends ABSource>(list: T[]) {
  const [idx, setIdx] = useState(0)
  const [version, setVersion] = useState<Version>('before')
  // Playing state and position belong to a release, so changing release resets both.
  const [playingTrack, setPlayingTrack] = useState<T | null>(null)
  const [clock, setClock] = useState<{ track: T | null; t: number }>({ track: null, t: 0 })
  const [loaded, setLoaded] = useState<{ track: T; dur: number } | null>(null)
  const [failed, setFailed] = useState<T | null>(null)
  const [match, setMatch] = useState(false)
  const [vol, setVolState] = useState(savedVolume)
  const track = list[Math.min(idx, list.length - 1)]

  const buffers = useRef<Record<Version, AudioBuffer> | null>(null)
  const graph = useRef<{ gain: Record<Version, GainNode>; master: GainNode } | null>(null)
  const sources = useRef<Record<Version, AudioBufferSourceNode> | null>(null)
  const startedAt = useRef(0) // audio-clock time at which position 0 would have played
  const offset = useRef(0) // position while paused
  const playingRef = useRef(false)

  const ready = loaded?.track === track
  const dur = ready ? loaded.dur : 0
  const playing = playingTrack === track
  const time = clock.track === track ? clock.t : 0

  const nodes = () => {
    if (!graph.current) {
      const c = audio()
      const master = c.createGain()
      master.connect(c.destination)
      const gain = { before: c.createGain(), after: c.createGain() }
      gain.before.connect(master)
      gain.after.connect(master)
      graph.current = { gain, master }
    }
    return graph.current
  }

  const stopSources = () => {
    const s = sources.current
    sources.current = null
    if (!s) return
    for (const n of Object.values(s)) {
      n.onended = null
      try {
        n.stop()
      } catch {
        /* never started */
      }
      n.disconnect()
    }
  }

  const position = useCallback(() => {
    if (!playingRef.current || !ctx) return offset.current
    return Math.min(Math.max(0, ctx.currentTime - startedAt.current), buffers.current ? Math.min(buffers.current.before.duration, buffers.current.after.duration) : 0)
  }, [])

  const startSources = (at: number) => {
    const b = buffers.current
    if (!b) return
    const c = audio()
    const g = nodes()
    const t0 = c.currentTime + 0.03
    const s = { before: c.createBufferSource(), after: c.createBufferSource() }
    for (const v of ['before', 'after'] as const) {
      s[v].buffer = b[v]
      s[v].connect(g.gain[v])
      s[v].start(t0, at)
    }
    s.before.onended = () => {
      if (sources.current !== s) return
      stopSources()
      playingRef.current = false
      offset.current = 0
      setPlayingTrack(null)
      setClock({ track: null, t: 0 })
    }
    sources.current = s
    startedAt.current = t0 - at
  }

  // Load both versions of the current release.
  useEffect(() => {
    let live = true
    offset.current = 0
    buffers.current = null
    Promise.all([decode(track.src.before), decode(track.src.after)])
      .then(([before, after]) => {
        if (!live) return
        buffers.current = { before, after }
        setLoaded({ track, dur: Math.min(before.duration, after.duration) })
        // A fresh start each time a release is opened.
        setPlayingTrack(null)
        setClock({ track, t: 0 })
        // Get the next release ready too, so picking it starts at once.
        const next = list[list.indexOf(track) + 1]
        if (next) Promise.all([decode(next.src.before), decode(next.src.after)]).catch(() => {})
      })
      .catch(() => live && setFailed(track))
    return () => {
      live = false
      stopSources()
      playingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track])

  // Download every clip in the list in the background.
  useEffect(() => preload(list), [list])

  // Stop everything when the player goes away.
  useEffect(() => () => {
    stopSources()
    graph.current?.master.disconnect()
    graph.current = null
  }, [])

  // Which version you hear, at what level.
  useEffect(() => {
    const g = nodes()
    const now = audio().currentTime
    const gap = track.lufs.after - track.lufs.before
    const trim = match ? Math.pow(10, -Math.abs(gap) / 20) : 1
    const level = { before: gap < 0 ? trim : 1, after: gap > 0 ? trim : 1 }
    for (const v of ['before', 'after'] as const) g.gain[v].gain.setTargetAtTime(v === version ? level[v] : 0, now, 0.006)
    g.master.gain.setTargetAtTime(vol * vol, now, 0.02)
  }, [version, match, vol, track])

  // Move the clock on screen while playing.
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setClock({ track, t: position() }), 100)
    return () => clearInterval(id)
  }, [playing, position, track])

  const play = useCallback(async () => {
    if (!buffers.current) return
    if (playingRef.current) {
      offset.current = position()
      stopSources()
      playingRef.current = false
      setPlayingTrack(null)
      setClock({ track, t: offset.current })
      return
    }
    await audio().resume()
    startSources(offset.current)
    playingRef.current = true
    setPlayingTrack(track)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, track])

  const seek = useCallback((ratio: number) => {
    const b = buffers.current
    if (!b) return
    const t = Math.max(0, Math.min(1, ratio)) * Math.min(b.before.duration, b.after.duration)
    offset.current = t
    setClock({ track, t })
    if (playingRef.current) {
      stopSources()
      startSources(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track])

  const setVol = (v: number) => {
    setVolState(v)
    try {
      localStorage.setItem(VOLUME_KEY, String(v))
    } catch {
      /* private window */
    }
  }

  const select = (i: number) => setIdx(i)

  return {
    idx,
    setIdx,
    track,
    version,
    setVersion,
    playing,
    play,
    time,
    dur,
    seek,
    match,
    setMatch,
    vol,
    setVol,
    select,
    loading: !ready && failed !== track,
    failed: failed === track,
  }
}
