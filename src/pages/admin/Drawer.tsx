import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from '@phosphor-icons/react'
import { cn } from '../../lib/utils'

// The admin's one drawer: from the right on a wide screen, a sheet from the bottom on a phone.
// It slides in when it mounts and out before `onClose` runs; Esc and the backdrop close it.
export function Drawer({ eyebrow, title, art, tabs, footer, children, onClose }: {
  eyebrow?: string
  title: string
  art?: string
  tabs?: ReactNode
  footer?: ReactNode
  children: ReactNode
  onClose: () => void
}) {
  const [shown, setShown] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const closing = useRef(false)

  const shut = () => {
    if (closing.current) return
    closing.current = true
    setShown(false)
    setTimeout(onClose, 220)
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') shut()
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close" tabIndex={-1} onClick={shut} className={cn('absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200', shown ? 'opacity-100' : 'opacity-0')} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'absolute inset-x-0 bottom-0 flex max-h-[92svh] flex-col rounded-t-3xl border-t border-white/10 bg-scarf-deep shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.8)] outline-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          'md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[560px] md:rounded-none md:rounded-l-3xl md:border-l md:border-t-0',
          shown ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full md:translate-y-0',
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/20 md:hidden" aria-hidden />
        <header className="flex shrink-0 items-start gap-4 px-6 pb-5 pt-5 sm:px-8 md:pt-8">
          {art && <img src={art} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="eyebrow truncate text-white/45">{eyebrow}</p>}
            <h2 className="mt-2 truncate font-heading text-[2rem] leading-none text-ink">{title}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={shut} className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/[0.06] hover:text-ink">
            <X size={18} aria-hidden />
          </button>
        </header>
        {tabs && <div className="shrink-0 px-6 pb-6 sm:px-8">{tabs}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-8 sm:px-8">{children}</div>
        {footer && <div className="shrink-0 border-t border-white/10 px-6 py-4 sm:px-8">{footer}</div>}
      </div>
    </div>
  )
}

// Ask before deleting, in the drawer's footer rather than a browser popup.
export function Confirm({ text, action, onKeep, onConfirm, busy }: { text: string; action: string; onKeep: () => void; onConfirm: () => void; busy?: boolean }) {
  return (
    <div role="alertdialog" aria-label={text} className="flex flex-wrap items-center gap-3">
      <p className="min-w-0 flex-1 text-sm text-ink">{text}</p>
      <button type="button" onClick={onKeep} disabled={busy} className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-5 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-ink hover:border-white/60">Keep</button>
      <button type="button" onClick={onConfirm} disabled={busy} className="inline-flex min-h-11 items-center rounded-full bg-red-400/90 px-5 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-black hover:bg-red-300 disabled:opacity-60">{busy ? 'Working…' : action}</button>
    </div>
  )
}
