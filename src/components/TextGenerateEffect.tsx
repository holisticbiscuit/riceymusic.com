import { useEffect } from 'react'
import { motion, stagger, useAnimate } from 'motion/react'
import { cn } from '../lib/utils'

// Aceternity text-generate: words blur+fade up in sequence on mount.
export function TextGenerateEffect({
  words,
  className,
  delay = 0,
  duration = 0.7,
}: {
  words: string
  className?: string
  delay?: number
  duration?: number
}) {
  const [scope, animate] = useAnimate()
  const wordList = words.split(' ')

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      animate('span', { opacity: 1, filter: 'blur(0px)', y: 0 }, { duration: 0 })
      return
    }
    animate(
      'span',
      { opacity: 1, filter: 'blur(0px)', y: 0 },
      { duration, delay: stagger(0.08, { startDelay: delay }), ease: [0.16, 1, 0.3, 1] },
    )
  }, [animate, delay, duration])

  return (
    <span ref={scope} className={cn(className)}>
      {wordList.map((word, i) => (
        <motion.span
          key={word + i}
          className="inline-block"
          style={{ opacity: 0, filter: 'blur(8px)', transform: 'translateY(14px)' }}
        >
          {word}
          {i < wordList.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </span>
  )
}
