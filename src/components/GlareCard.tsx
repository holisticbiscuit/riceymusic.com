import { useRef, type ReactNode } from 'react'
import { cn } from '../lib/utils'

// Aceternity-style glare card: tilts toward the cursor with a moving sheen.
// Pointer-driven only (no rAF loop); disabled on coarse pointers.
export function GlareCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const state = useRef({ rx: 0, ry: 0 })

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    state.current.rx = (py - 0.5) * -10
    state.current.ry = (px - 0.5) * 10
    el.style.setProperty('--rx', state.current.rx.toFixed(2) + 'deg')
    el.style.setProperty('--ry', state.current.ry.toFixed(2) + 'deg')
    el.style.setProperty('--mx', (px * 100).toFixed(1) + '%')
    el.style.setProperty('--my', (py * 100).toFixed(1) + '%')
    el.style.setProperty('--glare', '1')
  }

  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
    el.style.setProperty('--glare', '0')
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn('group relative', className)}
      style={{
        perspective: '900px',
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: 'rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))',
        }}
      >
        {children}
        {/* glare */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: 'var(--glare, 0)',
            background:
              'radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.22), transparent 45%)',
          }}
        />
      </div>
    </div>
  )
}
