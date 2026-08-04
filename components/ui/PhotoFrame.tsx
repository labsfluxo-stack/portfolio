/**
 * Moldura do retrato: 4:5, `object-cover`, borda de 1px em `--color-border`.
 * Sem `src`, mostra um placeholder explícito (não um retângulo vazio
 * anônimo). Quando `public/foto/neto.jpg` existir, trocar é só passar
 * `src="/foto/neto.jpg"` — nenhuma mudança de layout, e nenhuma preocupação
 * com o basePath do GitHub Pages: o componente já prefixa sozinho, com o
 * mesmo `NEXT_PUBLIC_BASE_PATH` (default `/portfolio`) que `next.config.ts`
 * e os scripts de build usam.
 */
export function PhotoFrame({
  alt,
  pendingLabel,
  src,
}: {
  alt: string
  pendingLabel: string
  src?: string
}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'

  return (
    <div className="aspect-[4/5] w-full max-w-xs border border-border bg-surface">
      {src ? (
        <img
          src={`${basePath}${src}`}
          alt={alt}
          className="h-full w-full object-cover grayscale-[35%] transition-[filter] duration-500 hover:grayscale-0"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {pendingLabel}
        </div>
      )}
    </div>
  )
}
