import type { Dictionary } from '@/content/types'

/**
 * Cinco itens, e cada um é um medo concreto de quem produz evento — não uma
 * lista de recursos. A ordem importa: a internet caindo é a falha número um de
 * ativação digital, e a data que não se move é a que fecha, porque é a única
 * que não tem conserto técnico.
 *
 * Lista NUMERADA, e é decisão de conteúdo: numeração transmite "isto é uma
 * checklist que você pode conferir", que é a leitura certa para um diretor de
 * operações. Marcador redondo transmite "isto é um folheto".
 */
export function Compra({ dict }: { dict: Dictionary }) {
  const { compra } = dict.ativacoes

  return (
    <section className="border-t border-border">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-serif text-4xl tracking-tight text-text sm:text-5xl">
          {compra.titulo}
        </h2>
        <ol className="flex flex-col">
          {compra.itens.map((item, i) => (
            <li
              key={item.titulo}
              className="revelar flex gap-5 border-t border-border py-6 first:border-t-0"
              style={{ '--i': i } as React.CSSProperties}
            >
              <span
                aria-hidden="true"
                className="pt-1 font-mono text-xs tabular-nums text-faint"
              >
                {/* Escrito no render a partir do índice, nunca no dicionário:
                  * um número à mão numa lista é a forma mais fácil de a
                  * numeração sair de sincronia com a ordem real. */}
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-[17px] font-semibold text-text">{item.titulo}</h3>
                <p className="text-[17px] leading-relaxed text-muted">{item.corpo}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
