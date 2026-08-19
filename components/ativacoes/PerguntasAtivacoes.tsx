import type { Dictionary } from '@/content/types'

/**
 * As objeções são de AGÊNCIA, não de marca: internet do estande, assinatura da
 * peça, compatibilidade com o totem alugado, plantão no dia, consentimento do
 * cadastro. Um FAQ com "o que é uma ativação?" estaria falando com o público
 * errado e diria, sem querer, que a página não sabe com quem fala.
 *
 * `<dl>` e não acordeão: são cinco respostas curtas, e esconder texto atrás de
 * clique numa página sem menu troca uma rolagem por cinco interações. Acordeão
 * também sonega o texto ao crawler que não executa JavaScript — o mesmo
 * argumento que a landing irmã deste repositório vende.
 */
export function PerguntasAtivacoes({ dict }: { dict: Dictionary }) {
  const { perguntas } = dict.ativacoes

  return (
    <section className="border-t border-border">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-serif text-4xl tracking-tight text-text sm:text-5xl">
          {perguntas.titulo}
        </h2>
        <dl className="flex flex-col">
          {perguntas.itens.map((item, i) => (
            <div
              key={item.pergunta}
              className="revelar flex flex-col gap-2 border-t border-border py-6 first:border-t-0"
              style={{ '--i': i } as React.CSSProperties}
            >
              <dt className="text-[17px] font-semibold text-text">{item.pergunta}</dt>
              <dd className="text-[17px] leading-relaxed text-muted">{item.resposta}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
