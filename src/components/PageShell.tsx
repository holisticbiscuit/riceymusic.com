import type { ReactNode } from 'react'
import { usePageTitle } from '../lib/usePageTitle'

// Inner-page frame: the scarf's shadow blue, its lit blue glowing down behind the title.
export function PageShell({
  eyebrow,
  title,
  children,
  wide,
}: {
  eyebrow?: string
  title: string
  children: ReactNode
  wide?: boolean // full-bleed content (the credits grid)
}) {
  usePageTitle(title)
  return (
    <div className="relative min-h-svh bg-scarf-deep">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(70%_100%_at_50%_0%,var(--color-scarf),transparent_75%)]"
      />
      <header className="relative px-5 pb-12 pt-32 text-center sm:px-8">
        {eyebrow && <p className="eyebrow text-white/55">{eyebrow}</p>}
        <h1 className="mt-5 font-display text-[clamp(3rem,9vw,7rem)] leading-none text-ink">{title}</h1>
      </header>
      <div className={wide ? 'relative' : 'relative mx-auto max-w-4xl px-5 pb-28 sm:px-8'}>{children}</div>
    </div>
  )
}
