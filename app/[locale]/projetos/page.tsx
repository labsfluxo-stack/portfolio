import type { Metadata } from 'next'
import { getDictionary, locales, type Locale } from '@/content'
import { buildMetadata } from '@/lib/seo'
import { LandingHero } from '@/components/landing/LandingHero'
import { Criterio } from '@/components/landing/Criterio'
import { Oferta } from '@/components/landing/Oferta'
import { Dupla } from '@/components/landing/Dupla'
import { Prova } from '@/components/landing/Prova'
import { Piso } from '@/components/landing/Piso'
import { LandingCta } from '@/components/landing/LandingCta'
import { Perguntas } from '@/components/landing/Perguntas'
import { Fecho } from '@/components/landing/Fecho'
import { BarraCta } from '@/components/landing/BarraCta'

export const dynamicParams = false

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

// `canonical` não existe em lib/seo.ts — o helper real é `buildMetadata`, o
// mesmo que app/[locale]/(site)/sistemas/[slug]/page.tsx usa. `ogImage` aponta
// para um arquivo que a Task 12 ainda vai gerar (ela estende a lista de slugs
// de OG para incluir `projetos`); a referência já sai correta agora, o
// arquivo só passa a existir depois.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(locale)
  return buildMetadata(locale, {
    title: dict.landing.meta.title,
    description: dict.landing.meta.description,
    path: '/projetos',
    ogImage: `/og/${locale}-projetos.png`,
    imageAlt: dict.landing.meta.description,
  })
}

/**
 * ORDEM DAS SEÇÕES. Não existe teste A/B publicado sobre ordem em landing B2B
 * de ticket alto — quem afirmar o contrário está apresentando gosto pessoal.
 * Esta ordem também é escolha, e vem de duas coisas: o orçamento de atenção
 * medido pelo NN/g (65% nos primeiros 40%, o que torna a regra orçamentária e
 * não sequencial) e o padrão observado nas páginas brasileiras que funcionam
 * — problema, método, prova, preço, CTA.
 *
 * O padding que evita a barra fixa cobrir o último bloco fica em
 * `layout.tsx` (no próprio `<main>`), não aqui — ver o comentário lá para o
 * porquê (padding em qualquer coisa dentro de `main` sempre coincide com o
 * fim do documento depois do scroll ao fundo, então "some" matematicamente).
 *
 * `BarraCta` vai dentro de um `<div>` só dela, e não solta como os demais
 * `dict={dict}` diretos: sem isso ela seria o próprio último filho de
 * `main`, e o teste que mede a sobreposição (`main > :last-child`) acabaria
 * comparando a barra com ela mesma. O `div` não fixo colapsa para altura
 * zero (o único filho dele é `position: fixed`, fora do fluxo) — existe só
 * para `:last-child` apontar para algo que não é a própria barra.
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <>
      {/* A DUPLA SUBIU PARA ANTES DA AUDITORIA, e a razão foi medida.
       *
       * No celular a página tem 6.747px; os primeiros 40% — onde o eyetracking
       * do NN/g mede 65% da atenção — terminam em 2.699px. A dupla estava em
       * 3.391px e a prova em 3.972px: o diferencial e a credibilidade viviam
       * nos 60% da página que recebem 35% da atenção.
       *
       * A causa é a ferramenta de auditoria, que sozinha ocupa quase 1.900px —
       * 28% da página inteira. Ela fica (é o que ninguém tem), mas o argumento
       * da dupla passa na frente dela.
       *
       * Ordem: quem é (dupla) → como julgar (critério + auditoria) → o que
       * entrega (oferta) → o que já entregou (prova) → preço → CTA. */}
      <LandingHero dict={dict} />
      <Dupla dict={dict} />
      <Criterio dict={dict} locale={locale} />
      <Oferta dict={dict} />
      <Prova dict={dict} locale={locale} />
      <Piso dict={dict} />
      <LandingCta dict={dict} />
      <Perguntas dict={dict} />
      <Fecho dict={dict} />
      <div>
        <BarraCta
          numero={dict.contact.whatsapp}
          rotulo={dict.landing.cta.rotulo}
          mensagem={dict.landing.cta.mensagem}
        />
      </div>
    </>
  )
}
