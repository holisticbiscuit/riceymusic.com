// Worlds: a shared 3D space where every visitor is a light leaving a trail. You fly your own (mouse
// or finger to steer, W A S D, Shift to boost); everyone else on the site right now flies theirs,
// live, through the Worker's room. Fly into Years' red atmosphere, or press Travel, and the world
// fades in slowly; the song comes in as you near its orbit (the 46 s excerpt, on a loop: the
// recording belongs to the label, and the full track is on the streaming links in the world).
import { Suspense, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { Volume } from '../components/Playback'
import { cn } from '../lib/utils'
import { usePageTitle } from '../lib/usePageTitle'
import { Beam, DarkPlanet, Glow, Nebula, YearsPlanet } from '../worlds/space'
import { livePath, useLiveLights, type LiveLight } from '../worlds/live'
import { useYearsAudio, type YearsAudio } from '../worlds/audio'
import { HereCount, NoWebGL, WorldFade, YEARS, YearsPanel, hasWebGL } from '../worlds/ui'

const EXCERPT = '/audio/years-excerpt.mp3'

type Phase = 'space' | 'travel' | 'world'

const UP = new THREE.Vector3(0, 1, 0)
const ATMOS = 2.35 // crossing this radius is entering Years
const CRUISE_R = 8 // the loose orbit you drift on when not steering
const SPEED = 2.1 // cruise
const FAST = 4.6 // W
const BOOST = 7.5 // Shift
const SLOW = 0.7 // S
const TRAVEL_S = 0.85
const WORLD_CAM = new THREE.Vector3(-1.9, 0.35, 3.6)
const WORLD_LOOK = new THREE.Vector3(-0.9, 0.1, 0)
const IDLE_S = 1.4
const HEAR_R = 11 // the song starts to come in from this far out, full in orbit

// Pointer aim (x, y in -1..1), the keys held, and the smoothed values the flight actually uses.
type Steer = { x: number; y: number; at: number; touched: boolean; keys: Set<string>; yaw: number; pitch: number; speed: number; roll: number; dx: number; dy: number }
type Me = { pos: THREE.Vector3; dir: THREE.Vector3; drawn: number }

// Everyone arrives somewhere different on the loose orbit, so lights don't start stacked up.
const startMe = (): Me => {
  const a = Math.random() * Math.PI * 2
  const pos = new THREE.Vector3(Math.sin(a) * 9.6, 0.4 + Math.random() * 0.6, Math.cos(a) * 9.6)
  return { pos, dir: new THREE.Vector3(-Math.cos(a), -0.02, Math.sin(a)).normalize(), drawn: 0 }
}

const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)

// Flies you: steering, idle cruise, the Travel autopilot, the atmosphere check, and the camera.
function Flight({ phase, me, steer, onEnter, audio, held }: { phase: Phase; me: Me; steer: RefObject<Steer>; onEnter: () => void; audio: YearsAudio; held: RefObject<boolean> }) {
  const { camera, size } = useThree()
  const look = useRef(new THREE.Vector3())
  const viewW = useRef(0.7)
  const trip = useRef<{ t0: number; p0: THREE.Vector3; p1: THREE.Vector3; p2: THREE.Vector3 } | null>(null)
  const entered = useRef(false)
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), right: new THREE.Vector3() }), [])

  useEffect(() => {
    if (phase === 'space') entered.current = false
    if (phase !== 'travel') trip.current = null
  }, [phase])

  useFrame((s, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = s.clock.elapsedTime
    const { pos, dir } = me
    me.drawn = performance.now()
    const st = steer.current!

    if (phase === 'space') {
      const active = t - st.at < IDLE_S
      // Mouse: a small dead zone in the middle, then a soft curve, so small moves are fine control.
      const curve = (v: number) => { const a = Math.max(0, Math.abs(v) - 0.04) / 0.96; return Math.sign(v) * Math.pow(a, 1.15) }
      const k = st.keys
      const keyYaw = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0)
      const keyPitch = (k.has('arrowup') ? 1 : 0) - (k.has('arrowdown') ? 1 : 0)
      const wantYaw = THREE.MathUtils.clamp(curve(st.x) + keyYaw, -1, 1)
      const wantPitch = THREE.MathUtils.clamp(curve(st.y) + keyPitch, -1, 1)
      // Smoothed, so turns ease in and out instead of snapping.
      const sm = 1 - Math.exp(-dt * 14)
      st.yaw += (wantYaw - st.yaw) * sm
      st.pitch += (wantPitch - st.pitch) * sm
      const wantSpeed = k.has('shift') ? BOOST : k.has('w') ? FAST : k.has('s') ? SLOW : SPEED
      st.speed += (wantSpeed - st.speed) * (1 - Math.exp(-dt * 2.2))
      st.roll += (-st.yaw * 0.45 - st.roll) * (1 - Math.exp(-dt * 4))
      if (st.dx || st.dy) {
        dir.applyAxisAngle(UP, -st.dx * 0.0035)
        tmp.right.crossVectors(dir, UP).normalize()
        dir.applyAxisAngle(tmp.right, -st.dy * 0.0028)
        st.dx = 0
        st.dy = 0
      }
      if (active && (Math.abs(st.yaw) > 0.002 || Math.abs(st.pitch) > 0.002)) {
        dir.applyAxisAngle(UP, -st.yaw * 2.5 * dt)
        tmp.right.crossVectors(dir, UP).normalize()
        dir.applyAxisAngle(tmp.right, st.pitch * 1.8 * dt)
      } else if (!active) {
        // Drift back onto a loose orbit around Years.
        tmp.a.set(pos.x, 0, pos.z)
        const r = tmp.a.length() || 1
        tmp.b.set(-tmp.a.z, 0, tmp.a.x).divideScalar(r)
        tmp.b.addScaledVector(tmp.a, -(r - CRUISE_R) * 0.03 / r)
        tmp.b.y += (0.6 - pos.y) * 0.08
        dir.lerp(tmp.b.normalize(), dt * 0.7)
      }
      // A soft floor and ceiling, so holding the pointer low never dives you away for good.
      if (Math.abs(pos.y) > 3.5) dir.y -= Math.sign(pos.y) * (Math.abs(pos.y) - 3.5) * 0.6 * dt
      dir.y = THREE.MathUtils.clamp(dir.y, -0.75, 0.75)
      dir.normalize()
      // Never too far out: past 24 the sky turns you home.
      if (pos.length() > 24) dir.lerp(tmp.c.copy(pos).negate().normalize(), dt * 1.2).normalize()
      pos.addScaledVector(dir, st.speed * dt)
      if (!entered.current && pos.length() < ATMOS) {
        entered.current = true
        onEnter()
      }
    } else if (phase === 'travel') {
      if (!trip.current) {
        const p0 = pos.clone()
        const p2 = tmp.a.set(pos.x, pos.y * 0.3, pos.z).normalize().multiplyScalar(ATMOS - 0.05).clone()
        const p1 = p0.clone().addScaledVector(dir, Math.min(3, p0.distanceTo(p2) * 0.35))
        trip.current = { t0: t, p0, p1, p2 }
      }
      const tr = trip.current
      const k = Math.min(1, (t - tr.t0) / TRAVEL_S)
      const e = ease(k)
      const u = 1 - e
      pos.set(0, 0, 0).addScaledVector(tr.p0, u * u).addScaledVector(tr.p1, 2 * u * e).addScaledVector(tr.p2, e * e)
      tmp.a.subVectors(tr.p1, tr.p0).multiplyScalar(2 * u).addScaledVector(tmp.b.subVectors(tr.p2, tr.p1), 2 * e)
      if (tmp.a.lengthSq() > 1e-6) dir.copy(tmp.a.normalize())
      if (k >= 1 && !entered.current) {
        entered.current = true
        onEnter()
      }
    } else {
      // In the world: you keep circling Years just inside its atmosphere.
      tmp.a.set(Math.cos(t * 0.32) * 2.25, Math.sin(t * 0.5) * 0.45 + 0.2, Math.sin(t * 0.32) * 2.25)
      tmp.b.copy(pos)
      pos.lerp(tmp.a, 1 - Math.exp(-dt * 1.2))
      tmp.b.subVectors(pos, tmp.b)
      if (tmp.b.lengthSq() > 1e-8) dir.copy(tmp.b.normalize())
    }

    // The music: fades in as you come close, full in orbit, paused once you're far away again
    // (it carries on from there next time). A pause pressed in the world holds until you leave.
    const d = pos.length()
    const n = phase === 'space' ? THREE.MathUtils.smoothstep(HEAR_R - d, 0, HEAR_R - ATMOS) : 1
    audio.near.current = n
    if (n <= 0.001) {
      held.current = false
      if (audio.playing) audio.stop()
    } else if (!audio.playing && !audio.blocked && !held.current && n > 0.02) {
      held.current = true // one try per approach; start() flags `blocked` if the browser says no
      void audio.start().then(ok => { if (ok) held.current = false })
    }

    // Camera.
    if (phase === 'world') {
      const f = 1 - Math.exp(-dt * 1.4)
      tmp.c.copy(WORLD_CAM)
      tmp.c.x += Math.sin(t * 0.15) * 0.08
      tmp.c.y += Math.cos(t * 0.12) * 0.05
      camera.position.lerp(tmp.c, f)
      look.current.lerp(WORLD_LOOK, f)
    } else {
      // Behind and a little above you. The view turns part-way toward Years (most of the way while
      // you drift, less while you steer, so you see where you're going), and you stay in frame.
      const portrait = size.width < size.height
      const steering = t - steer.current!.at < IDLE_S
      const wantW = phase === 'travel' ? 0.2 : steering ? (portrait ? 0.45 : 0.3) : portrait ? 0.9 : 0.7
      viewW.current += (wantW - viewW.current) * (1 - Math.exp(-dt * 1.5))
      tmp.a.copy(pos).negate().normalize() // toward Years
      tmp.b.copy(dir).multiplyScalar(1 - viewW.current).addScaledVector(tmp.a, viewW.current).normalize()
      tmp.c.copy(pos).addScaledVector(tmp.b, -3.8).addScaledVector(UP, 0.9)
      const f = 1 - Math.exp(-dt * (phase === 'travel' ? 9 : 3.5))
      camera.position.lerp(tmp.c, f)
      tmp.c.copy(pos).addScaledVector(tmp.b, 4)
      look.current.lerp(tmp.c, f)
    }
    // Bank into turns, and widen the view as you speed up.
    const st2 = steer.current!
    tmp.right.copy(look.current).sub(camera.position).normalize()
    camera.up.copy(UP).applyAxisAngle(tmp.right, phase === 'space' ? st2.roll : 0)
    camera.lookAt(look.current)
    const cam = camera as THREE.PerspectiveCamera
    const wantFov = phase === 'space' ? 58 + (st2.speed - SPEED) * 2.6 : 58
    if (Math.abs(cam.fov - wantFov) > 0.05) {
      cam.fov += (wantFov - cam.fov) * (1 - Math.exp(-dt * 3))
      cam.updateProjectionMatrix()
    }
  })
  return null
}

// Your light: the shared Beam, brighter and wider, with a soft halo and a "You" tag.
function You({ me }: { me: Me }) {
  const g = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Group>(null)
  const path = useMemo(() => () => me.pos, [me])
  useFrame((s) => {
    g.current?.position.copy(me.pos)
    if (halo.current) halo.current.scale.setScalar(0.9 + Math.sin(s.clock.elapsedTime * 3) * 0.08)
  })
  return (
    <>
      <Beam path={path} color="#fff3e8" width={0.32} length={14} size={0.045} />
      <group ref={g}>
        <group ref={halo}><Glow color="#ffd9c4" size={0.4} opacity={0.22} /></group>
      </group>
    </>
  )
}

// The atmosphere you cross to enter: a faint red shell that warms as you approach.
// The edge of Years' orbit: a soft red haze that thins to nothing at its rim (no hard disc).
const hazeVert = /* glsl */ `varying vec3 vN; varying vec3 vView;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vView = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`
const hazeFrag = /* glsl */ `uniform vec3 uColor; uniform float uAmount; varying vec3 vN; varying vec3 vView;
void main(){
  float k = pow(abs(dot(vN, vView)), 2.5);
  gl_FragColor = vec4(uColor, k * uAmount);
  #include <colorspace_fragment>
}`

function Atmosphere({ me }: { me: Me }) {
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color(YEARS.red) }, uAmount: { value: 0.05 } }), [])
  useFrame(() => {
    const d = me.pos.length()
    uniforms.uAmount.value = 0.03 + 0.09 * THREE.MathUtils.clamp(1 - (d - ATMOS) / 5, 0, 1)
  })
  return (
    <mesh>
      <sphereGeometry args={[ATMOS, 96, 96]} />
      <shaderMaterial uniforms={uniforms} vertexShader={hazeVert} fragmentShader={hazeFrag} transparent side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// Keeps the "You" tag (a DOM element) just above your light.
function Tag({ el, me }: { el: RefObject<HTMLSpanElement | null>; me: Me }) {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const m = el.current
    if (!m) return
    v.copy(me.pos).project(camera)
    const px = (v.x * 0.5 + 0.5) * size.width
    const py = (-v.y * 0.5 + 0.5) * size.height
    m.style.transform = `translate(${px}px, ${py - 22}px) translate(-50%, -50%)`
    m.style.visibility = v.z > 1 ? 'hidden' : 'visible'
  })
  return null
}

// Keeps a DOM marker on Years: under the planet when it's in view, pinned to the screen edge with
// an arrow when it isn't, so you always know which way home is.
function Marker({ el, phase }: { el: RefObject<HTMLDivElement | null>; phase: Phase }) {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const m = el.current
    if (!m) return
    m.style.opacity = phase === 'space' ? '1' : '0'
    v.set(0, 0, 0).project(camera)
    const behind = v.z > 1
    let x = v.x, y = v.y
    if (behind) { x = -x; y = -y }
    const inView = !behind && Math.abs(x) < 0.9 && Math.abs(y) < 0.9
    const arrow = m.querySelector<HTMLElement>('[data-arrow]')
    if (inView) {
      v.set(0, -2.6, 0).project(camera)
      x = v.x; y = v.y
      m.dataset.edge = 'no'
      if (arrow) arrow.style.display = 'none'
    } else {
      const k = 0.86 / Math.max(Math.abs(x), Math.abs(y), 1e-3)
      x *= k; y *= k
      m.dataset.edge = 'yes'
      if (arrow) {
        arrow.style.display = 'block'
        arrow.style.transform = `rotate(${Math.atan2(-y, x)}rad)`
      }
    }
    const px = (x * 0.5 + 0.5) * size.width
    const py = (-y * 0.5 + 0.5) * size.height
    m.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`
  })
  return null
}

// Someone else on the site right now, flying their own light.
function LiveBeam({ light, inWorld }: { light: LiveLight; inWorld: boolean }) {
  const path = useMemo(() => livePath(light), [light])
  // A steady colour per visitor: mostly cool white, some warm.
  const warm = parseInt(light.id.slice(0, 2), 16) % 4 === 0
  return <Beam path={path} label={light.city} width={inWorld ? 0.16 : 0.22} color={warm ? '#ffd2c8' : '#cfe0ff'} />
}

type Live = ReturnType<typeof useLiveLights>

function Scene({ phase, audio, me, steer, enter, marker, tag, held, live }: { phase: Phase; audio: YearsAudio; me: Me; steer: RefObject<Steer>; enter: () => void; marker: RefObject<HTMLDivElement | null>; tag: RefObject<HTMLSpanElement | null>; held: RefObject<boolean>; live: Live }) {
  return (
    <>
      <color attach="background" args={['#02040c']} />
      <fog attach="fog" args={['#02040c', 16, 46]} />
      <ambientLight intensity={0.25} />
      <pointLight position={[-6, 4, 6]} intensity={40} color="#9fb6ff" />
      <Nebula />
      <Stars radius={70} depth={50} count={7000} factor={2.2} saturation={0} fade speed={0.3} />
      {/* Fine dust: drifts past as you fly, so speed is felt */}
      <Sparkles count={260} scale={[40, 14, 40]} size={1.4} speed={0.25} opacity={0.35} color="#cfe0ff" noise={0.6} />
      <YearsPlanet audio={audio} />
      <Atmosphere me={me} />
      <DarkPlanet position={[-9, 2.2, -10]} radius={0.8} />
      <DarkPlanet position={[11, -1.4, -6]} radius={1} />
      <DarkPlanet position={[4, 3, -18]} radius={0.6} />
      {/* Everyone else on the site, live */}
      {live.ids.map(id => {
        const l = live.lights.current.get(id)
        return l ? <LiveBeam key={id} light={l} inWorld={phase === 'world'} /> : null
      })}
      <You me={me} />
      <Tag el={tag} me={me} />
      <Flight phase={phase} me={me} steer={steer} onEnter={enter} audio={audio} held={held} />
      <Marker el={marker} phase={phase} />
      {/* The glow: light bleeds softly, the edges fall into shadow */}
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.82} luminanceSmoothing={0.12} radius={0.6} />
        <Vignette eskil={false} offset={0.25} darkness={0.7} />
      </EffectComposer>
    </>
  )
}

export default function Worlds() {
  usePageTitle('Worlds')
  const [webgl] = useState(hasWebGL)
  if (!webgl) return <NoWebGL />
  return <Space />
}

function Space() {
  const [phase, setPhase] = useState<Phase>('space')
  const [steered, setSteered] = useState(false)
  const [ready, setReady] = useState(false)
  const audio = useYearsAudio(EXCERPT)
  const me = useMemo(startMe, [])
  const steer = useRef<Steer>({ x: 0, y: 0, at: -99, touched: false, keys: new Set(), yaw: 0, pitch: 0, speed: SPEED, roll: 0, dx: 0, dy: 0 })
  const phaseNow = useRef(phase)
  phaseNow.current = phase
  const live = useLiveLights(me, () => (phaseNow.current === 'world' ? 0.8 : steer.current.speed), () => (phaseNow.current === 'world' ? 'years' : 'space'))
  // How many of the live lights are in Years (they move between worlds without joining or leaving).
  const [yearsLive, setYearsLive] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      let n = 0
      for (const l of live.lights.current.values()) if (l.w === 'years') n++
      setYearsLive(n)
    }, 1000)
    return () => clearInterval(id)
  }, [live.lights])
  // You count too.
  const here = live.ids.length + 1
  const inYears = yearsLive + 1
  const marker = useRef<HTMLDivElement>(null)
  const tag = useRef<HTMLSpanElement>(null)
  const box = useRef<HTMLDivElement>(null)
  // Set while a play attempt is pending or after a pause pressed in the world.
  const held = useRef(false)

  const enter = () => setPhase('world')
  const travel = () => setPhase(p => (p === 'space' ? 'travel' : p))
  const back = () => {
    // Back out above the atmosphere, heading away; the cruise takes over again.
    me.pos.normalize().multiplyScalar(ATMOS + 1.4)
    me.dir.copy(me.pos).normalize()
    steer.current.at = -99
    setPhase('space')
  }

  const aim = (e: RPointerEvent) => {
    if (phase !== 'space' || !box.current) return
    if (e.pointerType !== 'mouse' && e.buttons === 0 && e.type === 'pointermove') return
    const r = box.current.getBoundingClientRect()
    steer.current.x = ((e.clientX - r.left) / r.width) * 2 - 1
    steer.current.y = -(((e.clientY - r.top) / r.height) * 2 - 1)
    if (e.type === 'pointermove') { steer.current.dx += e.movementX; steer.current.dy += e.movementY }
    steer.current.touched = true
    if (!steered) setSteered(true)
  }
  const release = (e: RPointerEvent) => {
    if (e.pointerType !== 'mouse' || e.type === 'pointerleave') { steer.current.x = 0; steer.current.y = 0 }
  }

  // Keys: W faster, S slower, Shift boost, A/D and the arrows turn. Any number can be held at once.
  useEffect(() => {
    const FLY = new Set(['w', 'a', 's', 'd', 'shift', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'])
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (!FLY.has(k) || phase !== 'space') return
      if ((e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]')) return
      e.preventDefault()
      steer.current.keys.add(k)
      steer.current.touched = true
      setSteered(true)
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (!FLY.has(k)) return
      steer.current.keys.delete(k)
    }
    const clear = () => steer.current.keys.clear()
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    window.addEventListener('blur', clear)
    return () => { window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up, true); window.removeEventListener('blur', clear) }
  }, [phase])

  return (
    <div
      ref={box}
      className="relative h-svh min-h-[560px] touch-none select-none overflow-hidden bg-[#02040c]"
      onPointerMove={aim}
      onPointerDown={aim}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      <Canvas camera={{ position: [4, 2, 12], fov: 58 }} dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}>
        <Suspense fallback={null}>
          <Scene phase={phase} audio={audio} me={me} steer={steer} enter={enter} marker={marker} tag={tag} held={held} live={live} />
          <SteerClock steer={steer} />
          <Warmup onReady={() => setReady(true)} />
        </Suspense>
      </Canvas>

      <WorldFade on={phase === 'world'} />

      {/* While the graphics card gets ready: a slow navy fade with a single line, never a black box */}
      <div aria-hidden={ready} className={cn('pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-[radial-gradient(80%_60%_at_50%_45%,#0b1640_0%,#02040c_70%)] transition-opacity duration-[1600ms] ease-out', ready ? 'opacity-0' : 'opacity-100')}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#cfe0ff] shadow-[0_0_24px_6px_rgba(207,224,255,0.5)]" />
        <p className="eyebrow mt-6 text-white/50">Entering space</p>
      </div>

      {/* your tag */}
      <span ref={tag} aria-hidden className={cn('pointer-events-none absolute left-0 top-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.22em] text-white/80 transition-opacity duration-700', phase === 'world' ? 'opacity-0' : 'opacity-100')}>You</span>

      {/* Years marker: under the planet, or at the edge pointing home */}
      <div ref={marker} aria-hidden className="pointer-events-none absolute left-0 top-0 transition-opacity duration-500" style={{ opacity: 0 }}>
        <div className="relative flex flex-col items-center">
          <span data-arrow className="absolute left-1/2 top-1/2 -ml-5 -mt-5 hidden h-10 w-10">
            <span className="absolute right-0 top-1/2 -mt-[5px] block h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-[#ff6b5e]" />
          </span>
          <span className="whitespace-nowrap rounded-full border border-[#e0141b]/40 bg-[#2a0306]/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffb3aa]">Years</span>
        </div>
      </div>

      {/* HUD */}
      <div className={cn('pointer-events-none absolute left-5 top-[4.75rem] transition-opacity duration-700 sm:left-8 lg:left-10', live.connected ? 'opacity-100' : 'opacity-0')}>
        <HereCount n={phase === 'world' ? inYears : here} where={phase === 'world' ? 'in Years' : 'in space'} />
      </div>

      <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center px-5 pb-8 text-center transition-opacity duration-500 sm:pb-10', phase === 'space' ? 'opacity-100' : 'opacity-0')}>
        <p className="eyebrow text-white/50">Worlds</p>
        <h1 className="mt-3 font-heading text-[clamp(2.2rem,5vw,3.4rem)] leading-none text-ink">You are a light.</h1>
        <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-white/60">
          {steered ? 'Your trail stays behind you. Fly into the red atmosphere to enter Years, or' : 'Steer with the mouse or a finger, W A S D to fly, Shift to boost. Fly into the red to enter Years, or'}
        </p>
        <button
          type="button"
          data-shoot="travel"
          onPointerDown={e => e.stopPropagation()}
          onClick={travel}
          className={cn('mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-6 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-black hover:bg-white', phase === 'space' && 'pointer-events-auto')}
        >
          Travel to Years <span aria-hidden>&rarr;</span>
        </button>
      </div>

      {/* sound: volume always to hand; if the browser blocked autoplay, one tap starts it */}
      <div className="pointer-events-auto absolute right-3 top-[4.1rem] z-20 flex items-center gap-3 sm:right-6 lg:right-8" onPointerDown={e => e.stopPropagation()}>
        {audio.blocked && !audio.playing && (
          <button type="button" data-shoot="sound-on" onClick={() => { held.current = false; void audio.start() }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e0141b]/50 bg-[#2a0306]/70 px-4 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-[#ffb3aa] backdrop-blur hover:border-[#ff6b5e]">
            Sound on
          </button>
        )}
        <div className="rounded-full bg-black/40 pr-3 backdrop-blur"><Volume value={audio.vol} onChange={audio.setVol} /></div>
      </div>

      {/* the world */}
      <div className="pointer-events-none absolute inset-0 flex items-center px-5 sm:px-10 lg:px-20" onPointerDown={e => e.stopPropagation()}>
        <YearsPanel audio={{ ...audio, toggle: async () => { held.current = audio.playing; await audio.toggle() } }} show={phase === 'world'} onBack={back} className={cn('max-w-md', phase === 'world' && 'pointer-events-auto')} />
      </div>
    </div>
  )
}

// Compiles every shader up front (in parallel where the browser can), then says it's ready, so
// the visitor sees a calm fade instead of a black screen while the graphics card works.
function Warmup({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let live = true
    const done = () => { if (live) requestAnimationFrame(() => requestAnimationFrame(onReady)) }
    const r = gl as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> }
    if (r.compileAsync) r.compileAsync(scene, camera).then(done, done)
    else { gl.compile(scene, camera); done() }
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

// Steering input stamps itself with the R3F clock, so the idle check in Flight compares like with like.
function SteerClock({ steer }: { steer: RefObject<Steer> }) {
  useFrame((s) => {
    const st = steer.current!
    if (st.touched) { st.at = s.clock.elapsedTime; st.touched = false }
    // Holding a direction (finger down, key held, pointer off-centre) counts as still steering.
    if (Math.abs(st.x) > 0.12 || Math.abs(st.y) > 0.12 || st.keys.size) st.at = s.clock.elapsedTime
  })
  return null
}
