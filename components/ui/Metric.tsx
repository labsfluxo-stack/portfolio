import { Counter } from './Counter'
import type { Locale } from '@/content/types'

export function Metric({
  value,
  label,
  provenance,
  locale,
  numeric,
  suffix,
}: {
  value: string
  label: string
  provenance: string
  locale: Locale
  numeric?: number
  suffix?: string
}) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="font-sans text-4xl font-bold tabular-nums" title={provenance}>
        {numeric !== undefined ? <Counter to={numeric} locale={locale} suffix={suffix} /> : value}
      </div>
      <div className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted">
        {label}
      </div>
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-faint">{provenance}</p>
    </div>
  )
}
