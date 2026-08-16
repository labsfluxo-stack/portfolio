export function Section({
  id,
  label,
  index,
  children,
  className,
}: {
  id: string
  label: string
  index?: string
  children: React.ReactNode
  /** Acrescentado às classes da `<section>`. Existe para o caso de uma seção
   * precisar de contexto de empilhamento próprio — `relative isolate` — porque
   * carrega um elemento decorativo em `z-index: -1` que, sem o isolamento,
   * cairia atrás do fundo da página e sumiria. */
  className?: string
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      // `scroll-mt-24` (6rem = 96px) evita que o <header> sticky (~63.5px)
      // cubra o título da seção depois do salto de âncora do navegador — sem
      // isso, `scroll-margin-top: 0` deixa o topo da seção exatamente atrás
      // da barra fixa, e o visitante aterrissa no que parece o meio do
      // conteúdo. Medido com tests/e2e/anchor-nav.spec.ts.
      className={`scroll-mt-24 border-t border-border py-24${className ? ` ${className}` : ''}`}
    >
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
