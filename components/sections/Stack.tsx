import type { Dictionary, Locale, StackLayer } from '@/content/types'
import { Section } from '@/components/ui/Section'

const LEVEL_ORDER = ['dominio', 'producao', 'contato'] as const

/** Emphasis is carried by weight and ink, never by hue — the palette stays
 * monochrome on purpose, and the level label itself is already visible
 * text, so color would only repeat information that is already declared. */
const LEVEL_STYLE: Record<(typeof LEVEL_ORDER)[number], { label: string; item: string }> = {
  dominio: { label: 'text-text', item: 'font-semibold text-text' },
  producao: { label: 'text-muted', item: 'font-medium text-muted' },
  contato: { label: 'text-faint', item: 'font-normal text-faint' },
}

function LayerCard({ layer, dict }: { layer: StackLayer; dict: Dictionary }) {
  const { stack } = dict

  return (
    <div className="border border-border bg-surface p-6">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{layer.label}</h3>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-faint">{stack.sourceNote[layer.source]}</p>

      <div className="mt-5 flex flex-col gap-4">
        {LEVEL_ORDER.map((level) => {
          const items = layer.items.filter((item) => item.level === level)
          if (items.length === 0) return null
          const style = LEVEL_STYLE[level]

          return (
            <div key={level}>
              <p className={`font-mono text-[10px] uppercase tracking-widest ${style.label}`}>
                {stack.levels[level]}
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <li
                    key={item.name}
                    className={`border border-border px-2 py-1 text-sm ${style.item}`}
                  >
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Grade por camada, redes primeiro (é a ordem em que `dict.stack.layers`
 * chega, e a ordem do posicionamento — nunca reordenada aqui). Cada camada
 * declara sua própria proveniência (`repo` ou `experience`) como texto
 * visível, não como metadado escondido: é o que separa este stack de uma
 * lista inflada de tecnologias.
 */
export function Stack({ dict }: { dict: Dictionary; locale: Locale }) {
  const { stack } = dict

  return (
    <Section id="stack" label={stack.label} index="04">
      <p className="max-w-2xl text-muted">{stack.lead}</p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stack.layers.map((layer) => (
          <LayerCard key={layer.label} layer={layer} dict={dict} />
        ))}
      </div>
    </Section>
  )
}
