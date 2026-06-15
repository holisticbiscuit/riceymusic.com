import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { cn } from '../lib/utils'

// A backdrop that drifts with scroll (parallax) AND breathes on its own
// (Ken Burns). Overscanned by 14% so the parallax travel never bares an edge.
export function ParallaxImage({
  src,
  opacity = 0.25,
  range = 14,
  slow = false,
  className,
}: {
  src: string
  opacity?: number
  range?: number
  slow?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [`-${range}%`, `${range}%`])

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <motion.div
        style={{ y, backgroundImage: `url('${src}')`, opacity }}
        className={cn(
          'absolute inset-[-14%] bg-cover bg-center kenburns',
          slow && 'kenburns-slow',
        )}
      />
    </div>
  )
}
