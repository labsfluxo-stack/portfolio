import type { Dictionary } from '@/content/types'
import { TOKENS_ESCUROS } from './polaridade'

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
    // ESCURECIDA POR REDEFINIÇÃO DE TOKEN, como o `Criterio` e a arte da
    // abertura. A paleta e o porquê de cada valor estão em `./polaridade`.
    //
    // ESTA É A SEÇÃO MAIS DENSA EM TEXTO DA PÁGINA, e a auditoria de
    // 2026-09-04 chegou a propor clareá-la para devolver ritmo à rolagem. Foi
    // descartado DEPOIS de medir: a seção ocupa ~419px entre dois blocos
    // escuros (`LandingCta` acima, `Fecho` abaixo), e uma faixa clara curta
    // espremida entre dois escuros lê como piscada, não como respiro. O
    // respiro passou a ser o `Piso`, que é claro por natureza e cai numa
    // fronteira onde a troca tem para onde ir.
    <section className="border-t border-rule bg-paper" style={TOKENS_ESCUROS}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16">
        <h2 className="revelar-titulo font-sans text-2xl font-bold tracking-tight text-ink">
          {perguntas.titulo}
        </h2>
        <div className="flex flex-col">
          {perguntas.itens.map((item) => (
            <details key={item.pergunta} className="group border-b border-rule py-4">
              {/* `marker:content-none` tira o triângulo NATIVO do <summary>
               * sem pôr nada no lugar (achado C-d da revisão final de
               * branch): o item de FAQ não dava sinal nenhum de que abria.
               * O `group` na `<details>` já existia sem consumidor -- o
               * chevron abaixo é o consumidor, girando 180° via
               * `group-open:` quando o navegador marca o atributo `[open]`. */}
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[17px] font-semibold text-ink marker:content-none">
                {item.pergunta}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="mt-1 size-4 shrink-0 text-ink-2 transition-transform duration-200 group-open:rotate-180"
                >
                  <path
                    d="M5 7.5 10 12.5 15 7.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>
              <p className="pt-3 text-[17px] leading-relaxed text-ink-2">{item.resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
