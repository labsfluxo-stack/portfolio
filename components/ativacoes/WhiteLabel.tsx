import type { Dictionary } from '@/content/types'

/**
 * A faixa mais curta da página, e a que decide a venda.
 *
 * O concorrente direto no ramo — estúdio de ativação que vende direto para a
 * marca — COMPETE com a agência pelo mesmo cliente. Esta seção existe para
 * dizer, em duas frases, que aqui isso não acontece. Curta de propósito:
 * argumento de confiança perde força a cada linha a mais, porque quem promete
 * demais soa como quem está se defendendo de alguma coisa.
 *
 * Fundo `--color-surface` em vez de `--color-bg`: numa página escura inteira,
 * a única forma de destacar uma faixa sem inventar cor é subir um degrau de
 * superfície.
 */
export function WhiteLabel({ dict }: { dict: Dictionary }) {
  const { whiteLabel } = dict.ativacoes

  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-serif text-4xl tracking-tight text-text sm:text-5xl">
          {whiteLabel.titulo}
        </h2>
        <div className="flex flex-col gap-4">
          {whiteLabel.corpo.map((paragrafo, i) => (
            <p
              key={paragrafo}
              className="revelar max-w-2xl text-[17px] leading-relaxed text-muted"
              style={{ '--i': i } as React.CSSProperties}
            >
              {paragrafo}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
