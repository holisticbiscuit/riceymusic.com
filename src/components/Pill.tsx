import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '../lib/utils'

type Props = {
  children: ReactNode
  to?: string // internal route
  href?: string // external link or mailto
  solid?: boolean
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}

// The site's one button shape: a rounded pill, solid ink or outlined.
export function Pill({ children, to, href, solid, className, onClick, type = 'button', disabled }: Props) {
  const cls = cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-[0.72rem] font-medium uppercase tracking-[0.18em] transition-colors duration-300 disabled:opacity-50',
    solid ? 'bg-ink text-black hover:bg-white' : 'border border-white/25 text-ink hover:border-white/70 hover:bg-white/[0.06]',
    className,
  )
  if (to) return <Link to={to} className={cls}>{children}</Link>
  if (href) {
    const external = /^https?:/.test(href)
    return (
      <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noopener' } : {})}>
        {children}
      </a>
    )
  }
  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>
}
