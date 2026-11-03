// Live lights: a WebSocket to the shared space on the site's Worker. Sends where your light is four
// times a second and keeps everyone else's latest position, velocity and world. Reconnects on its
// own, hangs up while the tab is hidden (so the free plan isn't spent on background tabs), and
// drops a light that has gone quiet.
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { API_URL } from '../lib/api'

export type Where = 'space' | 'years'
export type LiveLight = {
  id: string
  city: string
  w: Where
  target: THREE.Vector3 // last reported position
  vel: THREE.Vector3 // last reported velocity, to glide between reports
  shown: THREE.Vector3 // where it's drawn, easing toward the prediction
  at: number // performance.now() of the last report
}

// The room on the site's Worker (VITE_API_URL). ?space=ws://127.0.0.1:8787/space points a local
// build at a local Worker. Empty means no room: you fly alone.
const fromApi = API_URL ? API_URL.replace(/^http/, 'ws') + '/space' : ''
export const SPACE_URL = new URLSearchParams(location.search).get('space') ?? fromApi

const SEND_MS = 250
const QUIET_MS = 10_000
const r2 = (n: number) => Math.round(n * 100) / 100

// me.drawn is when your light was last drawn: a copy of the page that isn't on screen (or isn't
// animating) sends nothing, so it never shows up as a frozen light for everyone else.
export function useLiveLights(me: { pos: THREE.Vector3; dir: THREE.Vector3; drawn: number }, speed: () => number, where: () => Where) {
  const lights = useRef(new Map<string, LiveLight>())
  const [ids, setIds] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const getSpeed = useRef(speed)
  const getWhere = useRef(where)
  getSpeed.current = speed
  getWhere.current = where

  useEffect(() => {
    let ws: WebSocket | null = null
    let retry = 1000
    let timer = 0
    let send = 0
    let ping = 0
    let sweep = 0
    let stopped = false
    const sync = () => setIds([...lights.current.keys()])

    const upsert = (m: { id: string; c?: string; p: number[]; v: number[]; w: Where }) => {
      let l = lights.current.get(m.id)
      const p = new THREE.Vector3().fromArray(m.p)
      if (!l) {
        l = { id: m.id, city: m.c ?? 'somewhere', w: m.w, target: p, vel: new THREE.Vector3(), shown: p.clone(), at: 0 }
        lights.current.set(m.id, l)
        sync()
      }
      l.target.copy(p)
      l.vel.fromArray(m.v)
      l.w = m.w
      l.at = performance.now()
    }

    const connect = () => {
      if (stopped || document.hidden || !SPACE_URL) return
      ws = new WebSocket(SPACE_URL)
      ws.onopen = () => {
        retry = 1000
        setConnected(true)
        send = window.setInterval(() => {
          if (ws?.readyState !== WebSocket.OPEN || performance.now() - me.drawn > 1000) return
          const v = me.dir.clone().multiplyScalar(getSpeed.current())
          ws.send(JSON.stringify({ p: me.pos.toArray().map(r2), v: v.toArray().map(r2), w: getWhere.current() }))
        }, SEND_MS)
        ping = window.setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send('ping'), 30_000)
      }
      ws.onmessage = (e) => {
        if (e.data === 'pong') return
        let m
        try { m = JSON.parse(e.data) } catch { return }
        if (m.t === 'hi') {
          lights.current.clear()
          for (const l of m.lights) upsert(l)
          sync()
        } else if (m.t === 'm') upsert(m)
        else if (m.t === 'bye' && lights.current.delete(m.id)) sync()
      }
      ws.onclose = () => {
        clearInterval(send)
        clearInterval(ping)
        setConnected(false)
        lights.current.clear()
        sync()
        ws = null
        if (stopped || document.hidden) return
        timer = window.setTimeout(connect, retry)
        retry = Math.min(retry * 2, 30_000)
      }
    }

    const onVisible = () => {
      if (document.hidden) ws?.close()
      else if (!ws) { clearTimeout(timer); connect() }
    }
    sweep = window.setInterval(() => {
      const now = performance.now()
      let gone = false
      for (const [id, l] of lights.current) if (l.at && now - l.at > QUIET_MS) { lights.current.delete(id); gone = true }
      if (gone) sync()
    }, 2000)

    connect()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      clearTimeout(timer)
      clearInterval(sweep)
      document.removeEventListener('visibilitychange', onVisible)
      ws?.close()
    }
  }, [me])

  return { lights, ids, connected }
}

// Where to draw a live light this frame: its last report carried forward by its velocity (for at
// most half a second), eased into so it glides rather than steps.
export function livePath(l: LiveLight) {
  const want = new THREE.Vector3()
  let last = -1
  return (t: number) => {
    const dt = last < 0 ? 0 : Math.min(t - last, 0.1)
    last = t
    const ahead = Math.min((performance.now() - l.at) / 1000, 0.5)
    want.copy(l.target).addScaledVector(l.vel, ahead)
    l.shown.lerp(want, 1 - Math.exp(-dt * 8))
    return l.shown
  }
}
