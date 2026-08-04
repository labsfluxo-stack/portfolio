import type { Dictionary, Locale } from '@/content/types'
import { StatusBadge } from '@/components/ui/StatusBadge'

/**
 * O <h1> da página — único, per contrato do spec (§5.2). O `page.tsx`
 * anterior tinha um <h1> provisório; este componente o substitui.
 *
 * `data-constellation-slot` é o contêiner vazio que a Task 13 preenche com
 * a cena WebGL (ou o fallback SVG). Por ora fica sem conteúdo, atrás do
 * texto e sem capturar clique.
 */
export function Hero({ dict }: { dict: Dictionary; locale: Locale }) {
  const { hero } = dict

  return (
    <section id="hero" aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div data-constellation-slot aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-24 sm:py-32">
        <StatusBadge status="ok" label={hero.availability} />
        <div className="flex flex-col gap-4">
          <h1
            id="hero-heading"
            className="font-sans text-6xl font-bold leading-[1.05] tracking-tight text-text sm:text-7xl"
          >
            {hero.name}
          </h1>
          <p className="font-mono text-sm uppercase tracking-[0.2em] text-muted sm:text-base">{hero.role}</p>
        </div>
        <p className="max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">{hero.tagline}</p>
        <p aria-hidden="true" className="mt-16 font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
          {hero.scrollHint}
        </p>
      </div>
    </section>
  )
}
