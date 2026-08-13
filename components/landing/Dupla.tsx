import type { Dictionary } from '@/content/types'

/**
 * PRIMEIRA das duas faixas escuras da página (a outra é LandingCta). É aqui
 * que o ciano volta ao ambiente em que passa AA — sobre `#08090C` ele dá
 * 9,29:1; sobre o papel claro daria 1,93:1 e reprovaria.
 *
 * O argumento é o achado da pesquisa que nenhuma página brasileira faz. O
 * mercado dispara duas críticas: agência cobra estrutura que não escreve o
 * código, e freelancer é ponto único de falha. Uma dupla de dois sêniores é a
 * única configuração que neutraliza AS DUAS ao mesmo tempo.
 *
 * A estrutura é de negação ("sem gerente, sem estagiário, sem terceirização")
 * porque dizer o que não se faz é mais crível que adjetivo — tem custo, exclui
 * trabalho.
 *
 * OS NÚMEROS VÊM DA TELEMETRIA, que já carrega `provenance` dizendo como cada
 * um foi medido. Escrevê-los aqui faria as duas páginas divergirem na primeira
 * recontagem.
 */
export function Dupla({ dict }: { dict: Dictionary }) {
  const { dupla } = dict.landing

  // As chaves são as mesmas que a seção Telemetria do portfólio já usa.
  const daTelemetria = ['years', 'production']
    .map((key) => dict.telemetry.metrics.find((m) => m.key === key))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map((m) => ({ valor: m.value, rotulo: m.label.toLowerCase() }))

  const numeros = [...dupla.numeros, ...daTelemetria]

  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 sm:py-24">
        <h2 className="font-sans text-3xl font-bold tracking-tight sm:text-4xl">
          {dupla.titulo}
        </h2>
        <div className="flex max-w-2xl flex-col gap-4">
          {dupla.corpo.map((paragrafo) => (
            <p key={paragrafo} className="text-[17px] leading-relaxed text-muted">
              {paragrafo}
            </p>
          ))}
        </div>
        <dl className="flex flex-wrap gap-x-10 gap-y-5 border-t border-border pt-7">
          {numeros.map((n) => (
            <div key={n.rotulo} className="flex flex-col gap-1">
              <dt className="sr-only">{n.rotulo}</dt>
              <dd className="font-mono text-3xl font-bold text-data">{n.valor}</dd>
              <p aria-hidden="true" className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
                {n.rotulo}
              </p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
