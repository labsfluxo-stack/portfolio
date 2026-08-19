import Link from 'next/link'
import type { Dictionary, Locale } from '@/content/types'
import { systems } from '@/content/systems'

/**
 * A seção mais delicada da página: ela precisa dar confiança SEM afirmar
 * experiência que não existe. Não há case de ativação no portfólio, e nenhuma
 * frase aqui pode sugerir que há.
 *
 * A saída é de enquadramento, não de redação: o que se prova não é "já fizemos
 * ativação", é "o software que a gente escreve fica de pé". Os três sistemas
 * sustentam exatamente essa afirmação, e são verificáveis.
 *
 * A CONTAGEM NÃO É ESCRITA À MÃO. `{producao}` vem do dicionário e é
 * substituído aqui a partir de `content/systems.ts` — a mesma decisão de
 * `components/landing/Prova.tsx`. No dia em que um sistema mudar de status, a
 * frase acompanha; escrita à mão, ela passaria a mentir em silêncio.
 */
export function ProvaEngenharia({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { prova } = dict.ativacoes
  const emProducao = systems.filter((sistema) => sistema.production).length

  return (
    <section className="border-t border-border">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-20 sm:py-28">
        <h2 className="revelar-titulo font-serif text-4xl tracking-tight text-text sm:text-5xl">
          {prova.titulo}
        </h2>
        <p className="revelar max-w-2xl text-[17px] leading-relaxed text-muted">
          {prova.lead.replace('{producao}', String(emProducao))}
        </p>
        <ul className="revelar grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
          {systems.map((sistema) => (
            <li key={sistema.slug} className="flex h-full flex-col gap-2 bg-surface p-6">
              <h3 className="text-[17px] font-semibold text-text">{sistema.name}</h3>
              <p className="text-[17px] leading-relaxed text-muted">
                {dict.systems.detail[sistema.slug].tagline}
              </p>
            </li>
          ))}
        </ul>
        {/* Os cards acima são inertes de propósito — sem <Link>, sem hover,
          * sem foco. A página apagou Header/Footer/SkipLink porque todo item
          * de menu é uma saída, e três cards clicáveis para os case studies
          * eram três saídas grandes que a página já tinha decidido não ter.
          * A seção oferece exatamente uma: este link, ao fim.
          *
          * Mesma resolução já registrada em `components/landing/Prova.tsx` —
          * não é um critério novo aqui, é o achado que o dono já resolveu
          * numa página irmã; este comentário só nomeia o precedente para
          * quem vier depois não reabrir a discussão. */}
        <Link href={`/${locale}`} className="w-fit text-[17px] text-data hover:opacity-80">
          {prova.verCase}
        </Link>
      </div>
    </section>
  )
}
