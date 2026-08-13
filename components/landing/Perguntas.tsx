import type { Dictionary } from '@/content/types'

/**
 * Curta, no fim, para o subconjunto que já se engajou — coerente com o
 * orçamento de atenção (65% nos primeiros 40%).
 *
 * Cobre objeções previsíveis, e a primeira é a que mais importa: "e se um de
 * vocês ficar indisponível?". Responder objeção que o visitante ainda não
 * verbalizou é exatamente o que produz sensação de solidez — e é a única
 * fraqueza real do formato de dupla.
 *
 * `<details>` nativo em vez de acordeão em JavaScript: o conteúdo fica no HTML
 * mesmo fechado, que é o que os crawlers de IA leem, e o teclado funciona sem
 * escrever uma linha de comportamento.
 */
export function Perguntas({ dict }: { dict: Dictionary }) {
  const { perguntas } = dict.landing

  return (
    <section className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16">
        <h2 className="font-sans text-2xl font-bold tracking-tight text-ink">
          {perguntas.titulo}
        </h2>
        <div className="flex flex-col">
          {perguntas.itens.map((item) => (
            <details key={item.pergunta} className="group border-b border-rule py-4">
              <summary className="cursor-pointer list-none text-[17px] font-semibold text-ink marker:content-none">
                {item.pergunta}
              </summary>
              <p className="pt-3 text-[17px] leading-relaxed text-ink-2">{item.resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
