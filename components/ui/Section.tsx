export function Section({
  id,
  label,
  index,
  children,
}: {
  id: string
  label: string
  index?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-t border-border py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <h2
          id={`${id}-title`}
          className="mb-12 font-mono text-[11px] uppercase tracking-[0.2em] text-muted"
        >
          {index ? <span className="text-muted">{index} </span> : null}
          {label}
        </h2>
        {children}
      </div>
    </section>
  )
}
