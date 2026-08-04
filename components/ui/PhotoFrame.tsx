/**
 * Moldura do retrato: 4:5, `object-cover`, borda de 1px em `--color-border`.
 * Sem `src`, mostra um placeholder explícito (não um retângulo vazio
 * anônimo). Quando `public/foto/neto.jpg` existir, trocar é só passar
 * `src` — nenhuma mudança de layout.
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
  return (
    <div className="aspect-[4/5] w-full max-w-xs border border-border bg-surface">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover grayscale-[35%] transition-[filter] duration-500 hover:grayscale-0"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
          {pendingLabel}
        </div>
      )}
    </div>
  )
}
