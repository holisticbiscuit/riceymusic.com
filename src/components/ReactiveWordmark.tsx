import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { getLevels, visualsEnabled } from '../lib/audioBus'
import { cn } from '../lib/utils'

// RICEY, split per letter for the entrance, then modulated on Bodoni's
// optical-size axis while the record plays.
//
// font-variation-settings forces glyph re-rasterisation and is not composited on
// the GPU, so the value is quantised and the write is capped at 30fps. Without
// that this is the one genuine performance hazard in the whole idea.
export function ReactiveWordmark({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const letters = text.split('')

  useEffect(() => {
    if (!visualsEnabled()) return
    const el = ref.current
    if (!el) return

    let raf = 0
    let last = 0
    let prev = -1

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (t - last < 33) return // ~30fps
      last = t

      const { low, air } = getLevels()
      // Bodoni's opsz runs 6..96. Sit high, where the hairlines live, and let
      // the low end pull it down so strokes thicken on the kick.
      const opsz = Math.round((96 - low * 46 + air * 6) / 3) * 3
      if (opsz === prev) return
      prev = opsz
      el.style.fontVariationSettings = `"opsz" ${opsz}`
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      el.style.fontVariationSettings = ''
    }
  }, [])

  return (
    <h1 ref={ref} aria-label={text} className={cn(className)}>
      {letters.map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="inline-block"
          initial={{ opacity: 0, y: '0.28em', filter: 'blur(12px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.1, delay: 1.15 + i * 0.075, ease: [0.16, 1, 0.3, 1] }}
        >
          {ch}
        </motion.span>
      ))}
    </h1>
  )
}
