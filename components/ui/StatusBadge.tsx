const COLOR = { ok: 'bg-ok', warn: 'bg-warn', off: 'bg-off' } as const

export function StatusBadge({
  status,
  label,
}: {
  status: keyof typeof COLOR
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-2 border border-border bg-surface px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-muted">
      <span data-dot aria-hidden="true" className={`size-1.5 rounded-full ${COLOR[status]}`} />
      {label}
    </span>
  )
}
