import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Instrument_Serif } from 'next/font/google'
import type { Metadata } from 'next'
import { getDictionary, locales, type Locale } from '@/content'
import { buildMetadata, HREFLANG } from '@/lib/seo'
import { personJsonLd } from '@/lib/jsonld'

/**
 * A serifa itálica de destaque — três ou quatro palavras no site inteiro.
 *
 * É a assinatura visual de página cara em 2026: sans no corpo, serifa itálica
 * só no que precisa parar o olho. Aparece em três dos seis exemplos premium
 * levantados na pesquisa (Logoisum, Prisma, Pioneer), sempre do mesmo jeito.
 *
 * UM PESO, UM ESTILO, SUBCONJUNTO LATINO. Numa página cujo argumento é que ela
 * carrega rápido, fonte a mais não sai de graça — por isso não vem a família
 * inteira, só o itálico regular. `display: swap` para o texto aparecer na sans
 * enquanto ela baixa, em vez de deixar buraco na primeira dobra.
 */
const serifa = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  display: 'swap',
  variable: '--font-instrument',
})

export const dynamicParams = false

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

// Metadata da home (Task 14, spec §7): as rotas `og/[slug]` e `cv`, que
// também vivem sob este layout, exportam a sua própria `generateMetadata`
// (sempre `noindex`) e sobrescrevem isto por inteiro — Next não faz merge
// profundo de `openGraph`/`alternates` entre segmentos, então herdar este
// default nunca vaza um card indexável para uma rota que não deveria ter.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(locale)
  return buildMetadata(locale, {
    title: dict.meta.title,
    description: dict.meta.description,
    path: '',
    ogImage: `/og/${locale}-home.png`,
    imageAlt: dict.meta.ogAlt,
  })
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const dict = getDictionary(locale)
  const jsonLd = personJsonLd(locale, dict)

  return (
    <html lang={HREFLANG[locale]} className={`${GeistSans.variable} ${GeistMono.variable} ${serifa.variable}`}>
      <body className="min-h-dvh">
        {/* Identidade do dono do site (schema.org Person), presente em toda
         * rota sob este layout — inclusive `og/*` e `cv`, o que é inofensivo
         * porque as duas são `noindex`. Ver lib/jsonld.ts. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
