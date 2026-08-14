import Link from 'next/link'
import type { Dictionary, Locale } from '@/content/types'
import { systems } from '@/content/systems'
import { Counter } from '@/components/ui/Counter'

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
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 sm:py-24">
        <div className="flex flex-col gap-3">
          <h2 className="font-sans text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {prova.titulo}
          </h2>
          <p className="max-w-2xl text-[17px] leading-relaxed text-ink-2">{prova.lead}</p>
        </div>

        <ul className="flex flex-col gap-px overflow-hidden rounded-lg border border-rule bg-rule">
          {systems.map((system) => {
            const caso = dict.systems.detail[system.slug]
            return (
              <li key={system.slug} className="flex flex-col gap-4 bg-paper p-6">
                <h3 className="text-[17px] font-semibold text-ink">{caso.name}</h3>
                {/* Resultado de NEGÓCIO, não métrica de ferramenta — é o erro
                 * clássico que a pesquisa flagrou (dev prova competência
                 * técnica, esquece de provar resultado). `caso.outcome` é o
                 * mesmo texto do case study; nunca reescrito aqui. */}
                <p className="text-[17px] leading-relaxed text-ink-2">{caso.outcome}</p>
                {/* As métricas ESPECÍFICAS do sistema (content/systems.ts) —
                 * nunca as mesmas categorias que a Telemetria já soma (ver o
                 * comentário lá no topo do arquivo). Mesmo par dt/mono +
                 * dd/Counter que CaseStudy.tsx usa no cabeçalho do case; só
                 * duas por sistema aqui, contra quatro lá, porque este card é
                 * um resumo, não a página inteira. */}
                <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-rule pt-4">
                  {system.metrics.map((metric) => (
                    <div key={metric.key} className="min-w-0">
                      <dt className="font-mono text-[11px] uppercase tracking-widest text-ink-2">
                        {dict.systems.metricLabels[metric.key]}
                      </dt>
                      <dd className="mt-1 font-sans text-2xl font-bold tabular-nums text-ink">
                        <Counter to={metric.value} locale={locale} />
                      </dd>
                    </div>
                  ))}
                </dl>
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
