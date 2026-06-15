import { useRef, type ReactNode } from 'react'
import { cn } from '../lib/utils'

// Pulls its child toward the cursor while hovered, springs back on leave.
// Mouse-only — touch never triggers the transform.
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * strength
    const y = (e.clientY - (r.top + r.height / 2)) * strength
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
  }
  const reset = () => {
    if (ref.current) ref.current.style.transform = 'translate(0px, 0px)'
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={cn('inline-block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] [will-change:transform]', className)}
    >
      {children}
    </div>
  )
}
