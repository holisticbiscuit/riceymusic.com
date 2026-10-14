import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { Pill } from './Pill'
import { cn } from '../lib/utils'

const LINKS: [string, string][] = [
  ['/credits', 'Credits'],
  ['/artist', 'Artist'],
  ['/before-after', 'Before / After'],
  ['/services', 'Services'],
  ['/about', 'About'],
]

export function Nav() {
  const { pathname } = useLocation()
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenOn(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="absolute inset-x-0 top-0 z-40">
      <nav aria-label="Primary" className="flex h-16 items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link to="/" className="font-display text-lg tracking-[0.22em] text-ink">RICEY</Link>
        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn('font-mono text-[0.66rem] uppercase tracking-[0.2em] transition-colors hover:text-ink', isActive ? 'text-ink' : 'text-white/60')
              }
            >
              {label}
            </NavLink>
          ))}
          <Pill to="/contact" className="min-h-9 px-5">Contact</Pill>
        </div>
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpenOn(open ? null : pathname)}
          className="flex h-11 w-11 items-center justify-center md:hidden"
        >
          <span className="relative block h-3 w-6">
            <span className={cn('absolute left-0 top-0 h-px w-6 bg-ink transition-transform', open && 'translate-y-[5.5px] rotate-45')} />
            <span className={cn('absolute bottom-0 left-0 h-px w-6 bg-ink transition-transform', open && '-translate-y-[5.5px] -rotate-45')} />
          </span>
        </button>
      </nav>
      {open && (
        <div id="mobile-menu" className="border-t border-white/10 bg-black/95 px-5 pb-8 pt-4 backdrop-blur-xl md:hidden">
          {LINKS.map(([to, label]) => (
            <Link key={to} to={to} className="block border-b border-white/[0.08] py-4 font-display text-2xl text-ink">{label}</Link>
          ))}
          <Pill to="/contact" solid className="mt-6 w-full">Contact</Pill>
        </div>
      )}
    </header>
  )
}
