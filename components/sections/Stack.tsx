import type { Dictionary, Locale, StackLayer } from '@/content/types'
import { Section } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'

const LEVEL_ORDER = ['dominio', 'producao', 'contato'] as const

/** Emphasis é carregada por peso, tamanho e tinta — nunca por matiz nova. A
 * paleta é monocromática de propósito, e `--color-faint` reprova AA para
 * texto (ver app/globals.css): "contato" e "produção" dividem `text-muted`
 * porque não existe um terceiro tom legível abaixo dele neste fundo. O
 * terceiro degrau da hierarquia vem de `text-xs`+`font-normal` em vez de
 * `text-sm`+`font-medium` — dois eixos tipográficos, não cor. `item` carrega
 * o próprio tamanho (nunca um `text-sm` compartilhado no call site), senão
 * as duas classes de tamanho colidem sem vencedor previsível. */
const LEVEL_STYLE: Record<(typeof LEVEL_ORDER)[number], { label: string; item: string }> = {
  dominio: { label: 'text-text', item: 'text-sm font-semibold text-text' },
  producao: { label: 'text-muted', item: 'text-sm font-medium text-muted' },
  contato: { label: 'text-muted', item: 'text-xs font-normal text-muted' },
}

function LayerCard({ layer, dict }: { layer: StackLayer; dict: Dictionary }) {
  const { stack } = dict

  return (
    <div className="border border-border bg-surface p-6">
      {/* Origem como etiqueta ao lado do título, não como frase abaixo dele.
       * Era "Comprovado em código auditado." em toda camada, e seis laudos
       * empilhados fazem a seção soar defensiva. A distinção entre código e
       * experiência importa e por isso fica — o que saiu foi o tom. */}
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{layer.label}</h3>
        {/* `text-muted`, nunca `text-faint`: faint reprova AA para texto
         * (≈2.45:1 contra o fundo) e só pode ser usado em linha, não em
         * palavra — ver app/globals.css. A hierarquia contra o título da
         * camada vem do tamanho, 10px contra 11px, como no resto do site. */}
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted">
          {stack.sourceNote[layer.source]}
        </span>
      </div>

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
                    className={`border border-border px-2 py-1 ${style.item}`}
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
 * Grade por camada, software primeiro e redes por último — é a ordem em que
 * `dict.stack.layers` chega, e é a ordem do POSICIONAMENTO, nunca
 * reordenada aqui. "Redes & Infraestrutura" já abriu esta lista e, por ser
 * a camada com mais itens em nível de domínio, respondia sozinha à pergunta
 * "o que essa pessoa faz?" pela área errada (ver content/pt.ts,
 * stack.layers).
 *
 * Cada camada declara sua própria proveniência (`repo` ou `experience`)
 * como texto visível, não como metadado escondido: é o que separa este
 * stack de uma lista inflada de tecnologias.
 */
export function Stack({ dict }: { dict: Dictionary; locale: Locale }) {
  const { stack } = dict

  return (
    <Section id="stack" label={stack.label} index="04">
      <Reveal>
        <p className="max-w-2xl text-muted">{stack.lead}</p>
        {/* As três definições de nível, uma vez só. Elas moravam no rótulo de
         * cada nível dentro de cada card ("Domínio — usado em produção, sei
         * depurar") e, com seis camadas, a seção repetia a mesma explicação
         * treze vezes. Explicar o próprio critério a cada item não passa
         * rigor, passa insegurança. */}
        <p className="mt-3 max-w-2xl font-mono text-[10px] leading-relaxed text-muted">{stack.legend}</p>
      </Reveal>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stack.layers.map((layer, i) => (
          // `className="grid"` repassa a largura e a altura esticadas pela
          // grade para o card da camada (ver comentário em
          // components/ui/Reveal.tsx) — sem isso as camadas perdem a altura
          // uniforme na fileira.
          <Reveal key={layer.label} ordem={i + 1} className="grid">
            <LayerCard layer={layer} dict={dict} />
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
