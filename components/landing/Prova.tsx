import Link from 'next/link'
import type { Dictionary, Locale } from '@/content/types'
import { SYSTEM_SLUGS } from '@/content/types'

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
 * cases com número E metodologia declarada. Número sem metodologia lê como
 * marketing; número com ressalva lê como engenheiro.
 *
 * Consome os cases que já existem. Não duplica case nenhum — se duplicasse,
 * divergiriam.
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
          {SYSTEM_SLUGS.map((slug) => {
            const caso = dict.systems.detail[slug]
            return (
              <li key={slug} className="bg-paper">
                <Link
                  href={`/${locale}/sistemas/${slug}`}
                  className="flex flex-col gap-2 p-6 transition-colors hover:bg-rule/30"
                >
                  <h3 className="text-[17px] font-semibold text-ink">{caso.name}</h3>
                  {/* Resultado de NEGÓCIO, não métrica de ferramenta — é o erro
                   * clássico que a pesquisa flagrou (dev prova competência
                   * técnica, esquece de provar resultado). `caso.outcome` é o
                   * mesmo texto do case study; nunca reescrito aqui. */}
                  <p className="text-[17px] leading-relaxed text-ink-2">{caso.outcome}</p>
                  {/* `verCase` tem 4 palavras ("Ver o caso completo" / "Read the
                   * full case") — passa do teto de 1–3 palavras que libera rótulo
                   * mono abaixo de 17px. Copiar o padrão de `Oferta.tsx` (título de
                   * cartão, sempre ≤3 palavras) sem reconferir a contagem foi
                   * exatamente o erro que já custou uma rodada de correção na
                   * Task 5 — aqui ficou em text-[17px], não text-xs. */}
                  <span className="font-mono text-[17px] uppercase tracking-[0.15em] text-accent">
                    {prova.verCase}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
