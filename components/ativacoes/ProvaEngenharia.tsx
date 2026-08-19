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
            <li key={sistema.slug} className="bg-surface">
              <Link
                href={`/${locale}/sistemas/${sistema.slug}`}
                className="flex h-full flex-col gap-2 p-6 transition-opacity hover:opacity-80"
              >
                <h3 className="text-[17px] font-semibold text-text">{sistema.name}</h3>
                <p className="text-[17px] leading-relaxed text-muted">
                  {dict.systems.detail[sistema.slug].tagline}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        {/* UM link ao fim da seção, e não um por card além dos próprios cards:
          * numa página que apagou o menu para não ter saída nenhuma, três
          * saídas grandes desfazem a decisão. */}
        <Link href={`/${locale}`} className="w-fit text-[17px] text-data hover:opacity-80">
          {prova.verCase}
        </Link>
      </div>
    </section>
  )
}
