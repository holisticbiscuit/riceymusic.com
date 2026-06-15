import { cn } from '../lib/utils'

// Seamless infinite marquee — the track holds two copies and slides -50%.
export function Marquee({
  items,
  className,
  itemClassName,
}: {
  items: string[]
  className?: string
  itemClassName?: string
}) {
  const row = [...items, ...items]
  return (
    <div className={cn('marquee-mask relative flex overflow-hidden', className)}>
      <div className="marquee-track flex shrink-0">
        {row.map((item, i) => (
          <span key={i} className={cn('flex items-center whitespace-nowrap', itemClassName)}>
            {item}
            <span className="mx-8 text-[var(--color-ember)]" aria-hidden>&bull;</span>
          </span>
        ))}
      </div>
    </div>
  )
}
