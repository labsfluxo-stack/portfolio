import type { Dictionary } from '@/content/types'
import { ArteDupla } from './arte'

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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-20 sm:py-28">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:gap-12">
          <div className="flex flex-col gap-8 md:flex-1">
            <h2 className="revelar-titulo font-sans text-4xl font-bold tracking-tight sm:text-5xl">
              {dupla.titulo}
            </h2>
            <div className="flex max-w-2xl flex-col gap-4">
              {dupla.corpo.map((paragrafo) => (
                <p key={paragrafo} className="text-[17px] leading-relaxed text-muted">
                  {paragrafo}
                </p>
              ))}
            </div>
          </div>

          {/* Duas formas idênticas e conectadas — o argumento desenhado.
           *  É a única arte da página que usa `--color-data`: aqui, sobre o
           *  quase-preto da faixa, ele dá 9,29:1; sobre o papel claro daria
           *  1,93:1 e reprovaria AA.
           *
           *  `hidden md:block` porque no celular ela entraria entre o texto e
           *  os números, empurrando para baixo a prova numérica que é o que
           *  essa seção tem de mais forte. */}
          <div className="hidden md:block md:w-[38%]">
            <ArteDupla />
          </div>
        </div>
        <dl className="revelar flex flex-wrap gap-x-10 gap-y-5 border-t border-border pt-7">
          {numeros.map((n) => (
            <div key={n.rotulo} className="flex flex-col gap-1">
              {/* Antes o <dt> ficava `sr-only` e um <p aria-hidden> repetia o
               * MESMO texto só para aparecer na tela — duplicava o rótulo no
               * HTML estático (o crawler lia "desenvolvedores / 2 /
               * desenvolvedores"), na única página cuja tese é que o que o
               * crawler lê é o que importa. E um <p> solto dentro de <dl>,
               * fora de qualquer <dt>/<dd>, foge do content model do HTML5.
               *
               * A classe visível vai direto no <dt> (que já é o elemento
               * semanticamente correto para um rótulo dentro de <dl>) e
               * `order-2` resolve a ORDEM VISUAL sem mexer na ordem do DOM:
               * o <dt> continua vindo antes do <dd> no documento (dt-antes-dd
               * é o que o content model de <dl> exige), só que aparece depois
               * dele na tela -- o número em destaque, o rótulo abaixo, como
               * antes. */}
              <dt className="order-2 font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
                {n.rotulo}
              </dt>
              <dd className="order-1 font-mono text-3xl font-bold text-data">{n.valor}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
