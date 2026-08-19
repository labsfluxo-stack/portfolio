import type { Metadata } from 'next'
import { getDictionary, locales, type Locale } from '@/content'
import { buildMetadata } from '@/lib/seo'
import { CapaJogo } from '@/components/ativacoes/CapaJogo'
import { Catalogo } from '@/components/ativacoes/Catalogo'
import { Compra } from '@/components/ativacoes/Compra'
import { WhiteLabel } from '@/components/ativacoes/WhiteLabel'
import { ProvaEngenharia } from '@/components/ativacoes/ProvaEngenharia'
import { PerguntasAtivacoes } from '@/components/ativacoes/PerguntasAtivacoes'
import { ChamadaFinal } from '@/components/ativacoes/ChamadaFinal'
import { BarraCta } from '@/components/landing/BarraCta'

export const dynamicParams = false

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(locale)
  return buildMetadata(locale, {
    title: dict.ativacoes.meta.title,
    description: dict.ativacoes.meta.description,
    path: '/ativacoes',
    // O arquivo passa a existir na Task 11, que estende OG_SLUGS. A
    // referência já sai correta agora.
    ogImage: `/og/${locale}-ativacoes.png`,
    imageAlt: dict.ativacoes.meta.description,
  })
}

/**
 * ORDEM DAS SEÇÕES. O leitor é diretor de operações ou atendimento de agência,
 * e o que ele precisa saber, nesta ordem: que existe alguém que constrói (a
 * capa, provando na prática), o que exatamente (catálogo), por que confiar no
 * dia do evento (as cinco dores), que não vai perder o cliente (white-label) e
 * de onde vem a engenharia (prova).
 *
 * O white-label vem DEPOIS das dores e não antes, e é a única ordem que
 * funciona: white-label responde um medo que a pessoa só sente depois de
 * acreditar que a coisa funciona. Antes disso ela ainda está avaliando se vale
 * a conversa, não se vai perder o cliente.
 *
 * `BarraCta` vai dentro de um `<div>` só dela, e não solta como os demais: sem
 * isso ela seria o próprio último filho de `main`, e o teste que mede a
 * sobreposição (`main > :last-child`) acabaria comparando a barra com ela
 * mesma. O `div` não fixo colapsa para altura zero — o único filho dele é
 * `position: fixed`, fora do fluxo.
 */
export default async function AtivacoesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <>
      <CapaJogo dict={dict} locale={locale} />
      <Catalogo dict={dict} />
      <Compra dict={dict} />
      <WhiteLabel dict={dict} />
      <ProvaEngenharia dict={dict} locale={locale} />
      <PerguntasAtivacoes dict={dict} />
      <ChamadaFinal dict={dict} />
      <div>
        <BarraCta
          numero={dict.contact.whatsapp}
          rotulo={dict.ativacoes.cta.rotulo}
          mensagem={dict.ativacoes.cta.mensagem}
          polaridade="escura"
        />
      </div>
    </>
  )
}
