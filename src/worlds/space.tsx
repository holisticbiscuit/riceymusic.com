// The look of space for the Worlds variants, drawn with shaders rather than flat polygons: the
// Years planet (domain-warped red marble like the cover, lit, with an atmosphere and banded rings
// that grow with the song), dark planets for releases to come, visitors as smooth glowing light
// trails, and a faint nebula behind it all.
import { useMemo, useRef, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Html, Trail } from '@react-three/drei'
import * as THREE from 'three'
import type { YearsAudio } from './audio'
import surfaceUrl from './years-surface.webp'

const RED = '#e0141b'

// Light 3D value noise and fbm, shared by the shaders below. Cheap on purpose: heavier noise took
// several seconds to compile on Windows (ANGLE) before anything drew.
const NOISE = /* glsl */ `
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float snoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  float n = mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
                mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
  return n * 2.0 - 1.0;
}
float fbm(vec3 p){ float v = 0.0, a = 0.5; for(int i = 0; i < 4; i++){ v += a * snoise(p); p = p * 2.02 + vec3(17.1, 3.7, 9.2); a *= 0.5; } return v; }
`


// ---------- the Years planet ----------

const planetVert = /* glsl */ `
varying vec3 vPos; varying vec3 vN; varying vec3 vView; varying vec3 vWorldN; varying vec2 vUv;
void main(){
  vPos = position; vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vWorldN = normalize(mat3(modelMatrix) * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`

const planetFrag = /* glsl */ `
uniform float uTime; uniform float uLevel; uniform float uRings; uniform vec3 uLight; uniform sampler2D uMap;
varying vec3 vPos; varying vec3 vN; varying vec3 vView; varying vec3 vWorldN; varying vec2 vUv;
${NOISE}
// The red marble and its fine dark cracks are baked into uMap ahead of time (RGB colour, A = crack),
// so the planet draws at once instead of compiling heavy noise. Lighting and glow stay live.
void main(){
  vec3 p = normalize(vPos);
  vec4 tex = texture2D(uMap, vUv);
  vec3 col = pow(tex.rgb, vec3(2.2));
  float veins = tex.a;
  // A touch of fine grain so it stays crisp up close.
  col *= 0.92 + 0.16 * snoise(p * 90.0);
  float band = smoothstep(0.08, 0.5, col.r);
  vec3 L = normalize(uLight);
  float nl = dot(vN, L);
  float diff = clamp(nl, 0.0, 1.0);
  float wrap = clamp((nl + 0.35) / 1.35, 0.0, 1.0);
  vec3 H = normalize(L + vView);
  float spec = pow(clamp(dot(vN, H), 0.0, 1.0), 48.0) * band * 0.3;
  vec3 lit = col * (0.05 + wrap * 0.25 + diff * 1.0) + vec3(1.0, 0.75, 0.7) * spec;
  // On the night side the cracks glow, breathing slowly and brighter with the music.
  float night = 1.0 - smoothstep(-0.15, 0.25, nl);
  float breathe = 0.85 + 0.15 * sin(uTime * 0.6 + snoise(p * 4.0) * 3.0);
  lit += vec3(1.0, 0.12, 0.07) * veins * night * breathe * (0.3 + uLevel * 1.5);
  // Growth rings around the pole: more appear as the song goes on.
  float lat = acos(clamp(p.y, -1.0, 1.0)) / 3.14159;
  float ring = smoothstep(0.985, 1.0, sin(lat * 3.14159 * uRings * 2.0 + veins)) * step(lat, uRings / 26.0 + 0.02);
  lit += vec3(1.0, 0.55, 0.45) * ring * (0.12 + uLevel * 0.9) * (0.4 + diff);
  // Red rim of atmosphere and scattering at the terminator.
  float rim = pow(1.0 - clamp(dot(vN, vView), 0.0, 1.0), 3.0);
  float term = smoothstep(-0.25, 0.1, nl) * (1.0 - smoothstep(0.1, 0.45, nl));
  lit += vec3(0.95, 0.15, 0.1) * (rim * (0.55 + uLevel * 0.8) + term * 0.1);
  gl_FragColor = vec4(pow(max(lit, 0.0), vec3(2.2)), 1.0);
  #include <colorspace_fragment>
}`

const atmoVert = /* glsl */ `
varying vec3 vN; varying vec3 vView;
void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vView = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`
const atmoFrag = /* glsl */ `
uniform vec3 uColor; uniform float uLevel; uniform vec3 uLight; varying vec3 vN; varying vec3 vView;
void main(){
  float edge = pow(1.0 - abs(dot(vN, vView)), 3.0);
  float sun = clamp(dot(vN, normalize(uLight)) * 0.5 + 0.6, 0.15, 1.0);
  gl_FragColor = vec4(uColor * (0.8 + uLevel), edge * sun * (0.45 + uLevel * 0.4));
  #include <colorspace_fragment>
}`

// Banded rings in a disc, like growth rings; their count grows with the song.
const ringVert = /* glsl */ `varying vec2 vUv; varying vec3 vPos; void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`
const ringFrag = /* glsl */ `
uniform float uInner; uniform float uOuter; uniform float uRings; uniform float uLevel; uniform float uTime;
varying vec3 vPos;
${NOISE}
void main(){
  float r = length(vPos.xy);
  float k = (r - uInner) / (uOuter - uInner);
  float n = snoise(vec3(vPos.xy * 3.0, uTime * 0.03)) * 0.15;
  float bands = pow(0.5 + 0.5 * sin((k + n * 0.1) * 3.14159 * uRings), 6.0);
  float fine = 0.5 + 0.5 * sin(k * 220.0 + n * 8.0);
  float shown = smoothstep(0.0, 0.03, k) * (1.0 - smoothstep(min(1.0, uRings / 22.0) - 0.04, min(1.0, uRings / 22.0), k));
  float a = (bands * 0.7 + fine * 0.12) * shown * (1.0 - k * 0.55) * (0.28 + uLevel * 0.7);
  gl_FragColor = vec4(pow(mix(vec3(1.0, 0.5, 0.42), vec3(0.9, 0.12, 0.1), k), vec3(2.2)), a);
  #include <colorspace_fragment>
}`

const LIGHT = new THREE.Vector3(-0.6, 0.45, 0.75)

export function YearsPlanet({ audio, radius = 1.4, onClick, hoverable }: { audio?: YearsAudio; radius?: number; onClick?: () => void; hoverable?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState(false)
  const map = useLoader(THREE.TextureLoader, surfaceUrl)
  const uniforms = useMemo(() => {
    // Raw bytes in, converted in the shader: alpha holds the cracks, not opacity.
    map.colorSpace = THREE.NoColorSpace
    map.anisotropy = 8
    map.wrapS = THREE.RepeatWrapping
    map.needsUpdate = true
    return { uTime: { value: 0 }, uLevel: { value: 0 }, uRings: { value: 6 }, uLight: { value: LIGHT.clone() }, uMap: { value: map } }
  }, [map])
  const atmo = useMemo(() => ({ uColor: { value: new THREE.Color(RED) }, uLevel: { value: 0 }, uLight: { value: LIGHT.clone() } }), [])
  const ring = useMemo(() => ({ uInner: { value: radius * 1.5 }, uOuter: { value: radius * 2.6 }, uRings: { value: 6 }, uLevel: { value: 0 }, uTime: { value: 0 } }), [radius])
  const scale = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  useFrame((s, dt) => {
    const lv = audio?.level.current ?? 0
    const rings = 6 + (audio?.progress.current ?? 0) * 18
    uniforms.uTime.value = s.clock.elapsedTime
    uniforms.uLevel.value = lv
    uniforms.uRings.value = rings
    atmo.uLevel.value = lv
    ring.uRings.value = rings
    ring.uLevel.value = lv
    ring.uTime.value = s.clock.elapsedTime
    if (mesh.current) {
      mesh.current.rotation.y += dt * 0.04
      const k = 1 + lv * 0.04 + (hover ? 0.025 : 0)
      mesh.current.scale.lerp(scale.set(k, k, k), 0.12)
    }
  })
  return (
    <group>
      <mesh
        ref={mesh}
        onClick={onClick}
        onPointerOver={() => { if (hoverable) { setHover(true); document.body.style.cursor = 'pointer' } }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
      >
        <sphereGeometry args={[radius, 256, 192]} />
        <shaderMaterial uniforms={uniforms} vertexShader={planetVert} fragmentShader={planetFrag} toneMapped={false} />
      </mesh>
      <mesh scale={1.1}>
        <sphereGeometry args={[radius, 128, 128]} />
        <shaderMaterial uniforms={atmo} vertexShader={atmoVert} fragmentShader={atmoFrag} transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.25, 0.08, 0]}>
        <ringGeometry args={[radius * 1.5, radius * 2.6, 512, 1]} />
        <shaderMaterial uniforms={ring} vertexShader={ringVert} fragmentShader={ringFrag} transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ---------- releases still to come ----------

const darkFrag = /* glsl */ `
uniform vec3 uLight; uniform float uSeed; varying vec3 vPos; varying vec3 vN; varying vec3 vView; varying vec3 vWorldN;
${NOISE}
void main(){
  vec3 p = normalize(vPos);
  float f = fbm(p * 2.4 + uSeed);
  vec3 col = mix(vec3(0.012, 0.018, 0.045), vec3(0.05, 0.075, 0.16), smoothstep(-0.3, 0.4, f));
  float diff = clamp(dot(vN, normalize(uLight)), 0.0, 1.0);
  float rim = pow(1.0 - clamp(dot(vN, vView), 0.0, 1.0), 3.2);
  vec3 lit = col * (0.15 + diff * 0.9) + vec3(0.35, 0.5, 1.0) * rim * 0.35;
  gl_FragColor = vec4(pow(max(lit, 0.0), vec3(2.2)), 1.0);
  #include <colorspace_fragment>
}`

export function DarkPlanet({ position, radius = 0.6 }: { position: [number, number, number]; radius?: number }) {
  const uniforms = useMemo(() => ({ uLight: { value: LIGHT.clone() }, uSeed: { value: position[0] * 1.7 + position[2] } }), [position])
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 128, 128]} />
      <shaderMaterial uniforms={uniforms} vertexShader={planetVert} fragmentShader={darkFrag} toneMapped={false} />
    </mesh>
  )
}

// ---------- the nebula behind everything ----------

const nebulaVert = /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`
const nebulaFrag = /* glsl */ `
varying vec3 vDir;
${NOISE}
void main(){
  vec3 d = normalize(vDir);
  float a = fbm(d * 1.4 + vec3(3.0));
  float b = fbm(d * 2.8 + a * 1.8);
  vec3 navy = vec3(0.035, 0.06, 0.16), violet = vec3(0.09, 0.04, 0.16), ember = vec3(0.22, 0.02, 0.04);
  vec3 col = navy * smoothstep(-0.1, 0.6, a) * 0.9 + violet * smoothstep(0.1, 0.7, b) * 0.6;
  col += ember * smoothstep(0.35, 0.9, b) * smoothstep(0.0, 0.6, -d.z) * 0.6;
  gl_FragColor = vec4(pow(col * 0.55, vec3(2.2)), 1.0);
  #include <colorspace_fragment>
}`

export function Nebula() {
  return (
    <mesh>
      <sphereGeometry args={[120, 64, 64]} />
      <shaderMaterial vertexShader={nebulaVert} fragmentShader={nebulaFrag} side={THREE.BackSide} depthWrite={false} toneMapped={false} fog={false} />
    </mesh>
  )
}

// ---------- visitors as light ----------

// A soft round glow, drawn once and shared: points of light with no polygon edges.
let glowTex: THREE.Texture | null = null
export function glowTexture() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,255,255,1)')
  gr.addColorStop(0.12, 'rgba(255,255,255,0.85)')
  gr.addColorStop(0.35, 'rgba(255,255,255,0.22)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 128, 128)
  glowTex = new THREE.CanvasTexture(c)
  glowTex.colorSpace = THREE.SRGBColorSpace
  return glowTex
}

export function Glow({ color = '#ffffff', size = 0.3, opacity = 1 }: { color?: string; size?: number; opacity?: number }) {
  return (
    <sprite scale={[size, size, size]}>
      <spriteMaterial map={glowTexture()} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </sprite>
  )
}

// A visitor: a point of light on its path, drawing a smooth comet trail that thins and fades behind it.
export function Beam({ path, color = '#cfe0ff', width = 0.22, length = 9, label, size = 0.028 }: {
  path: (t: number) => THREE.Vector3
  color?: string
  width?: number
  length?: number
  label?: string
  size?: number
}) {
  const head = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  const start = useMemo(() => path(0).clone(), [path])
  useFrame((s) => { head.current?.position.copy(path(s.clock.elapsedTime)) })
  return (
    <Trail width={width} length={length} color={color} attenuation={(t) => t * t * t} decay={1} interval={1}>
      <group ref={head} position={start}>
        <Glow color={color} size={size * 6} opacity={0.8} />
        <Glow color="#ffffff" size={size * 3} />
        <mesh visible={false} onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
          <sphereGeometry args={[size * 4, 8, 8]} />
          <meshBasicMaterial />
        </mesh>
        {label && hover && (
          <Html center distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <span className="whitespace-nowrap rounded-full bg-black/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/80">Someone in {label}</span>
          </Html>
        )}
      </group>
    </Trail>
  )
}
