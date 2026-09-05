import type { Dictionary } from '@/content/types'
import { MUTED_ESCURO } from './polaridade'
import { ArteDupla } from './arte'

/**
 * A SEGUNDA BANDA ESCURA DA PÁGINA, logo abaixo do hero (as outras são
 * LandingCta e Fecho). É aqui que o ciano vive no ambiente em que passa AA —
 * sobre escuro ele dá 9,29:1; sobre o papel claro daria 1,93:1 e reprovaria.
 *
 * O ARGUMENTO MUDOU COM O FATO. Este comentário dizia que "uma dupla de dois
 * sêniores é a única configuração que neutraliza as duas críticas do mercado".
 * A entrega é de uma pessoa só, então a seção trocou de resposta:
 *
 * - Agência cobra estrutura que não escreve o código → uma pessoa só responde
 *   isso melhor que uma dupla, e a resposta nem mudou de palavras.
 * - Freelancer é ponto único de falha → responde-se com ARTEFATO, não com
 *   gente: o código no repositório do cliente, documentado e coberto por teste.
 *   "Os dois conhecem o código" falhava se os dois saíssem; isto não falha.
 *
 * A seção não conta pessoas em momento nenhum — nem duas, nem uma.
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
    // DUAS BANDAS ESCURAS SEGUIDAS, E ELAS PRECISAM SE DISTINGUIR.
    //
    // O hero virou escuro e esta secao vem colada nele. Chegou a clarear por
    // isso — a pagina alterna bandas, e duas escuras iguais viram um bloco unico
    // de ~1400px com a fronteira dissolvida logo na abertura.
    //
    // MESMO PRETO DO HERO, por decisao do dono. Cheguei a usar `--color-surface`
    // aqui para dar um degrau de valor entre as duas bandas; ele resolvia a
    // costura, mas fazia a segunda secao parecer um tom "quase igual" em vez de
    // continuidade deliberada. Com o mesmo `--color-bg` das duas, quem separa e
    // a hairline em `--color-border` e o proprio ritmo do conteudo.
    //
    // E o ciano volta a ser legitimo nesta secao: sobre escuro ele da 9,29:1.
    // Foi por ela ter clareado que ele tinha sido trocado por `--color-accent`
    // (ver `contraste.test.ts`); com o fundo de volta, a troca se desfaz.
    // `MUTED_ESCURO`: ver ./polaridade — os dois parágrafos desta seção usam
    // `text-muted`, que não é alcançado pela inversão `bg-ink text-paper`.
    <section className="border-t border-border bg-ink text-paper" style={MUTED_ESCURO}>
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

          {/* O sistema construído e o repositório que fica com o cliente — o
           *  argumento desenhado. Eram duas formas idênticas e espelhadas, e a
           *  simetria ERA o argumento antigo; virou entrega quando o argumento
           *  virou.
           *
           *  `hidden md:block` porque no celular ela entraria entre o texto e
           *  os números, empurrando para baixo a prova numérica que é o que
           *  essa seção tem de mais forte. */}
          <div className="hidden md:block md:w-[42%]">
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
