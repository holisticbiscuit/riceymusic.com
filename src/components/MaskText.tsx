import { type ElementType } from 'react'
import { motion } from 'motion/react'

// Word-by-word mask reveal: each word rides up from behind a clip edge on
// scroll-in. More premium than a blur-fade for display headings.
export function MaskText({
  text,
  as,
  className,
  delay = 0,
  stagger = 0.05,
  once = true,
}: {
  text: string
  as?: ElementType
  className?: string
  delay?: number
  stagger?: number
  once?: boolean
}) {
  const Tag = (as ?? 'span') as ElementType
  const words = text.split(' ')
  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <span key={word + i} className="mask-line leading-[1.05]">
          <motion.span
            className="inline-block"
            initial={{ y: '110%' }}
            whileInView={{ y: 0 }}
            viewport={{ once, margin: '-10% 0px' }}
            transition={{ duration: 0.75, delay: delay + i * stagger, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}
