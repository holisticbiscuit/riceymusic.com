import { useState } from 'react'
import { sortRoles, type Credit } from '../lib/credits'
import { cn } from '../lib/utils'

// Square cover, no gap. Details show on hover (mouse) or on tap (touch).
export function CreditTile({ c }: { c: Credit }) {
  const [show, setShow] = useState(false)
  return (
    <div
      className="group relative aspect-square w-full overflow-hidden bg-scarf-deep"
      onMouseLeave={() => setShow(false)}
    >
      <button
        type="button"
        aria-expanded={show}
        aria-label={`${c.title} by ${c.artist}`}
        onClick={() => setShow(s => !s)}
        className="absolute inset-0 h-full w-full text-left"
      >
        {c.art ? (
          <img
            src={c.art}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <span className="flex h-full w-full flex-col justify-end bg-[radial-gradient(120%_90%_at_30%_20%,var(--color-scarf),var(--color-scarf-deep)_70%)] p-4">
            <span className="font-display text-xl leading-tight text-ink sm:text-2xl">{c.title}</span>
            <span className="mt-1 text-xs text-white/60">{c.artist}</span>
          </span>
        )}
      </button>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 transition-opacity duration-300 sm:p-5',
          show ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
        )}
      >
        <span className="font-display text-lg leading-tight text-ink sm:text-xl">{c.title}</span>
        <span className="mt-1 text-[0.8rem] text-white/70">{c.artist}</span>
        <span className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-scarf-text">
          {sortRoles(c.roles).map(r => <span key={r}>{r}</span>)}
        </span>
        <span className="mt-1.5 flex items-center gap-x-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-white/55">
          <span>{c.date.slice(0, 4)}</span>
          {c.versions && <span>{c.versions.length} versions</span>}
          {c.url && (
            <a
              href={c.url}
              target="_blank"
              rel="noopener"
              className="pointer-events-auto ml-auto text-ink underline-offset-4 hover:underline"
              tabIndex={show ? 0 : -1}
            >
              Listen
            </a>
          )}
        </span>
      </div>
    </div>
  )
}

export function CreditGrid({ credits }: { credits: Credit[] }) {
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {credits.map(c => (
        <li key={c.id}><CreditTile c={c} /></li>
      ))}
    </ul>
  )
}
