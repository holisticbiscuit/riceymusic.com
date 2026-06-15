import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { cn } from '../lib/utils'

// One fixed backdrop for the whole page. Each scene's opacity is driven by global
// scroll progress so the images crossfade ("morph") into one another between
// sections, while every layer keeps its slow Ken Burns drift. This is what makes
// the whole page feel like one continuous moving film.

const SCENES: { src: string; max: number; pos?: string }[] = [
  // hero crop biased toward the face (head sits high in this near-square frame)
  { src: '/images/hero.webp', max: 0.85, pos: 'center 38%' },
  { src: '/images/about.webp', max: 0.4 },
  { src: '/images/music.webp', max: 0.5 },
  { src: '/images/services.webp', max: 0.38 },
  { src: '/images/contact.webp', max: 0.46 },
]

function Layer({
  src,
  max,
  input,
  progress,
  slow,
  pos = 'center',
}: {
  src: string
  max: number
  input: number[]
  progress: MotionValue<number>
  slow?: boolean
  pos?: string
}) {
  const output = input.length === 2 ? (input[0] === 0 ? [max, 0] : [0, max]) : [0, max, 0]
  const opacity = useTransform(progress, input, output)
  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      <div
        className={cn('absolute inset-[-12%] bg-cover kenburns', slow && 'kenburns-slow')}
        style={{ backgroundImage: `url('${src}')`, backgroundPosition: pos }}
      />
    </motion.div>
  )
}

export function SceneBackdrop() {
  const { scrollYProgress } = useScroll()
  const n = SCENES.length
  const step = 1 / (n - 1)

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-base" aria-hidden>
      {SCENES.map((s, i) => {
        const center = i * step
        const input = i === 0 ? [0, step] : i === n - 1 ? [1 - step, 1] : [center - step, center, center + step]
        return <Layer key={s.src} src={s.src} max={s.max} input={input} progress={scrollYProgress} slow={i % 2 === 0} pos={s.pos} />
      })}

      {/* cinematic grade shared by every scene */}
      <div className="absolute inset-0 bg-gradient-to-b from-base/55 via-base/25 to-base/78" />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(125% 85% at 50% 38%, transparent 42%, var(--color-base) 100%)' }} />
      {/* top scrim so the nav stays legible over any scene */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-base/75 to-transparent" />
    </div>
  )
}
