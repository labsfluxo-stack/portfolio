import type { Dictionary, Locale } from '@/content/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PorticoSlot } from '@/components/three/PorticoSlot'

/**
 * O <h1> da página — único, per contrato do spec (§5.2). O `page.tsx`
 * anterior tinha um <h1> provisório; este componente o substitui.
 *
 * `data-portico-slot` é o contêiner atrás do texto, sem capturar clique
 * (`pointer-events-none`), com o pórtico que empilha as camadas do sistema:
 * a cena WebGL quando o navegador aguenta, ou a elevação técnica em SVG
 * quando não (`PorticoSlot` decide). Os rótulos dos contêineres são os
 * mesmos `dict.stack.layers[].label` da seção Stack — a cena não inventa
 * texto nenhum. O `<h1>` e o resto continuam vivendo em HTML puro, sem
 * depender da cena para nada: ela é decoração, `aria-hidden` de ponta a
 * ponta.
 */
export function Hero({ dict }: { dict: Dictionary; locale: Locale }) {
  const { hero } = dict
  const layerLabels = dict.stack.layers.map((layer) => layer.label)

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      // Mesmo tratamento de Section.tsx (scroll-mt-24): o Hero não usa o
      // primitivo, mas fica sob o mesmo <header> sticky e precisa da mesma
      // margem de rolagem para qualquer link de âncora que aponte para cá.
      className="relative scroll-mt-24 overflow-hidden"
    >
      {/* Confinada à metade direita a partir de `md`. Ocupando a largura
          inteira, a máquina cruzava o badge de disponibilidade e o bloco do
          nome — lia como acidente, não como composição. Abaixo de `md` a cena
          vira a elevação em SVG e fica bem apagada, para não competir com o
          texto na largura onde não há espaço para os dois. */}
      <div
        data-portico-slot
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-full opacity-40 md:left-1/2 md:w-1/2 md:opacity-100"
      >
        <PorticoSlot labels={layerLabels} />
      </div>
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
        <p aria-hidden="true" className="mt-16 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
          {hero.scrollHint}
        </p>
      </div>
    </section>
  )
}
