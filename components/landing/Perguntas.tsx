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
    // ESCURECIDA POR REDEFINIÇÃO DE TOKEN, como o `Criterio` e a arte da
    // abertura. Todo token do projeto mora em `@theme`, então cada utilitário
    // resolve para `var(--color-*)` — redefini-los aqui inverte a árvore
    // inteira abaixo sem tocar em uma classe sequer.
    //
    // É o que torna barato escurecer uma seção com dezenas de classes de
    // polaridade clara espalhadas em componentes filhos, e o que impede a
    // primeira classe esquecida de virar texto escuro sobre fundo escuro.
    //
    // `--color-accent` vira o ciano: `#0369A1` sobre preto some, e é ele que
    // pinta as barras, os números e os destaques desta seção.
    <section
      className="border-t border-rule bg-paper"
      style={
        {
          '--color-paper': '#08090C',
          '--color-ink': '#F5F3EF',
          '--color-ink-2': '#878C96',
          '--color-rule': '#1F232B',
          '--color-accent': '#38BDF8',
        } as React.CSSProperties
      }
    >
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
