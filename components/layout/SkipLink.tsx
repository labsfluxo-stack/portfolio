export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#conteudo"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-border focus:bg-surface focus:px-4 focus:py-2 focus:font-mono focus:text-sm"
    >
      {label}
    </a>
  )
}
