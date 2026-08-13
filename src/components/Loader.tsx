import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

// Brief intro curtain: the wordmark settles, then the panel lifts to reveal the
// hero. Skipped instantly under reduced-motion.
export function Loader() {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(() => setDone(true), reduce ? 0 : 1000)
    return () => clearTimeout(t)
  }, [])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-base"
          exit={{ y: '-100%' }}
          transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
        >
          <motion.span
            className="font-display text-2xl text-ink"
            initial={{ opacity: 0, letterSpacing: '0.55em' }}
            animate={{ opacity: 1, letterSpacing: '0.2em' }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          >
            RICEY
          </motion.span>
          <motion.span
            className="absolute bottom-10 left-1/2 -translate-x-1/2 font-mono text-[0.6rem] uppercase tracking-[0.3em] text-white/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.7 }}
          >
            Signed to mau5trap
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
