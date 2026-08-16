import Link from 'next/link'
import type { Dictionary, Locale } from '@/content/types'
import { systems } from '@/content/systems'
import { formatNumber } from '@/lib/format'

/**
 * Depoimento é SINAL BARATO — qualquer um escreve um, e o comprador sabe
 * disso. Não ter depoimento é menos grave do que parece: o teto de
 * credibilidade dele já é baixo.
 *
 * Software sob medida vendido a dono não técnico é um *credence good*: ele não
 * consegue avaliar a qualidade nem depois de consumir. Sob essa assimetria o
 * que funciona é sinal CARO e verificável — e na lista do que de fato
 * influencia decisão de compra (TrustRadius, 1.862 compradores), demonstração
 * vem ACIMA de avaliação de terceiros.
 *
 * Daí as duas camadas: a própria página como demonstração conferível, e os
 * cases com resultado E números que sustentam a escala de cada um.
 *
 * Consome os cases e os sistemas que já existem em content/systems.ts. Não
 * duplica nada — se duplicasse, divergiria.
 *
 * DOIS DEFEITOS DA REVISÃO FINAL DE BRANCH, corrigidos juntos:
 *
 * C1 CRÍTICO — o `lead` afirmava "três sistemas em operação" (FALSO: só 2 de
 * 3 têm `production: true`) e prometia "o número que ele moveu e como foi
 * medido" numa seção que renderizava zero dígitos. A correção NÃO é só trocar
 * a frase: é fazer a seção mostrar o que ela promete. `system.metrics` já
 * existe em content/systems.ts com procedência implícita no próprio código
 * (não é medição solta); `dict.systems.metricLabels` já traduz cada chave.
 * O padrão de render é o de CaseStudy.tsx (dt/dd + <Counter>) — reaproveitado
 * aqui, não reinventado. Nenhuma contagem de sistema (quantos existem,
 * quantos estão em produção) é escrita à mão em `dict.landing.prova`: se um
 * dia a copy precisar de um número desses, ele tem de vir computado
 * (`systems.filter((s) => s.production).length`), nunca como palavra solta no
 * dicionário — é exatamente esse hard-code que causou o defeito C1.
 *
 * I6 IMPORTANTE — cada card era um `<Link>` inteiro para o case study, no
 * polo escuro, sem rota de volta: a landing apagou Header e Footer (todo item
 * de menu é uma saída) e sobrou os três cards como as maiores saídas não-CTA
 * da página. Decisão do dono: os cards continuam mostrando nome, resultado e
 * métricas, mas deixam de ser clicáveis — existe UM link discreto no fim da
 * seção, não três grandes.
 */
export function Prova({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { prova } = dict.landing

  return (
    <section className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-20 sm:py-28">
        <div className="flex flex-col gap-3">
          <h2 className="font-sans text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            {prova.titulo}
          </h2>
          <p className="max-w-2xl text-[17px] leading-relaxed text-ink-2">{prova.lead}</p>
        </div>

        <ul className="flex flex-col gap-px overflow-hidden rounded-lg border border-rule bg-rule">
          {systems.map((system) => {
            const caso = dict.systems.detail[system.slug]
            return (
              <li key={system.slug} className="flex flex-col gap-5 bg-paper p-6 sm:flex-row sm:gap-10 sm:p-8">
                {/* O NÚMERO VEM PRIMEIRO, E GRANDE.
                 *
                 * Antes era parágrafo longo e, no rodapé dele, os números em
                 * corpo pequeno. Medida a página inteira, esta era a seção mais
                 * pesada de ler — três blocos de prosa empilhados — e é a mais
                 * importante que existe aqui. Quem passa o olho via texto e
                 * pulava.
                 *
                 * Invertido, o número faz o trabalho que ele sabe fazer: para o
                 * olho. E resolve de quebra a hierarquia plana da página, onde
                 * fora o h1 tudo tinha o mesmo peso.
                 *
                 * Coluna fixa no desktop (`sm:w-40`) para os três cards
                 * alinharem os números na mesma linha vertical — desalinhado,
                 * o bloco lê como três coisas soltas em vez de uma tabela. */}
                <dl className="flex shrink-0 gap-8 sm:w-40 sm:flex-col sm:gap-5">
                  {system.metrics.map((metric) => (
                    <div key={metric.key} className="min-w-0">
                      {/* SEM `<Counter>` aqui, e a razão mudou com o tamanho.
                       *
                       * A Telemetria anima porque lá o número é 250.000 e a
                       * subida tem para onde ir. Estes são 146, 42, 14, 13, 40
                       * e 3 — e em corpo 5xl, ver "3" escalar de zero é
                       * precisamente o padrão que a pesquisa listou entre os
                       * datados: animar um número pequeno chama atenção para o
                       * quanto ele é pequeno. Em 2xl passava despercebido;
                       * neste tamanho, não. */}
                      <dd className="font-sans text-4xl font-bold tabular-nums leading-none text-ink sm:text-5xl">
                        {formatNumber(metric.value, locale)}
                      </dd>
                      <dt className="mt-1.5 font-mono text-[11px] uppercase tracking-widest text-ink-2">
                        {dict.systems.metricLabels[metric.key]}
                      </dt>
                    </div>
                  ))}
                </dl>

                <div className="flex flex-col gap-2 border-t border-rule pt-5 sm:border-l sm:border-t-0 sm:pl-10 sm:pt-0">
                  <h3 className="text-[19px] font-semibold text-ink">{caso.name}</h3>
                  {/* Resultado de NEGÓCIO, não métrica de ferramenta — é o erro
                   * clássico que a pesquisa flagrou (dev prova competência
                   * técnica, esquece de provar resultado). `caso.outcome` é o
                   * mesmo texto do case study; nunca reescrito aqui. */}
                  <p className="text-[17px] leading-relaxed text-ink-2">{caso.outcome}</p>
                </div>
              </li>
            )
          })}
        </ul>

        {/* ÚNICO link da seção (achado I6) — antes eram três, um por card, no
         * polo escuro do portfólio e sem rota de volta. `prefetch={false}`
         * pela mesma razão de Contact.tsx e SystemCard.tsx: sem isso o Next
         * pré-carrega o payload RSC da rota assim que o link entra em
         * viewport, e ninguém pediu.
         *
         * Estilo do próprio dono (ver .superpowers/sdd/.../progress.md, Task
         * 7/8): corpo legível, não rótulo mono em caixa alta — a Task 7 tinha
         * aumentado só o tamanho e mantido mono/caixa-alta/tracking, e essa
         * era a mesma classe de defeito que a Task 5 já tinha corrigido
         * removendo o tratamento inteiro, não só o tamanho. */}
        <Link prefetch={false} href={`/${locale}`} className="w-fit text-[17px] font-semibold text-accent">
          {prova.verCase}
        </Link>
      </div>
    </section>
  )
}
