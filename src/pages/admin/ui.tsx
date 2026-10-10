import type { ReactNode } from 'react'

export const inputCls =
  'min-h-11 w-full rounded-lg border border-white/15 bg-white/[0.06] px-3.5 text-[0.95rem] text-ink placeholder:text-white/35 focus:border-white/50 focus:outline-none'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="eyebrow text-white/55">{label}</span>
      {children}
      {hint && <span className="text-xs text-white/45">{hint}</span>}
    </label>
  )
}
