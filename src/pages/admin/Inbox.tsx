import { ArrowUpRight, CaretRight } from '@phosphor-icons/react'
import { cn } from '../../lib/utils'
import { when, type Enquiry } from './messages'

export function MessageList({ messages, isRead, onOpen, empty }: { messages: Enquiry[]; isRead: (id: string) => boolean; onOpen: (m: Enquiry) => void; empty?: string }) {
  if (!messages.length) return <p className="text-white/60">{empty}</p>
  return (
    <ul className="glass divide-y divide-white/[0.07] overflow-hidden rounded-2xl">
      {messages.map(m => {
        const fresh = !isRead(m.id)
        return (
          <li key={m.id}>
            <button type="button" onClick={() => onOpen(m)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.035]">
              <span aria-label={fresh ? 'New' : undefined} className={cn('h-2 w-2 shrink-0 rounded-full', fresh ? 'bg-scarf-text' : 'bg-transparent')} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-heading text-[1.25rem] leading-tight text-ink">{m.track}</span>
                  <span className="shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-white/40">{when(m.at)}</span>
                </span>
                <span className="mt-0.5 block truncate text-sm text-white/60">{m.name} · <span className="text-scarf-text">{m.service}</span></span>
              </span>
              <CaretRight size={14} className="shrink-0 text-white/30" aria-hidden />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function MessageView({ m }: { m: Enquiry }) {
  return (
    <div className="space-y-6">
      <dl className="grid gap-3 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-white/50">From</dt><dd className="text-right text-ink">{m.name}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-white/50">Email</dt><dd className="truncate text-right text-ink">{m.email}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-white/50">Service</dt><dd className="text-right text-scarf-text">{m.service}</dd></div>
      </dl>
      <a href={m.link} target="_blank" rel="noopener noreferrer" className="glass flex items-center justify-between gap-4 rounded-2xl px-5 py-4 hover:bg-white/[0.04]">
        <span className="min-w-0">
          <span className="eyebrow block text-white/45">Files</span>
          <span className="mt-1 block truncate text-sm text-ink">{m.link}</span>
        </span>
        <ArrowUpRight size={16} className="shrink-0 text-white/60" aria-hidden />
      </a>
      {m.note ? <p className="whitespace-pre-wrap text-[1.02rem] leading-relaxed text-white/80">{m.note}</p> : <p className="text-sm text-white/40">No note.</p>}
    </div>
  )
}
