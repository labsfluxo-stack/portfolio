import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import type { Metadata } from 'next'
import { getDictionary, locales, type Locale } from '@/content'
import { buildMetadata, HREFLANG } from '@/lib/seo'
import { personJsonLd } from '@/lib/jsonld'

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
    <html lang={HREFLANG[locale]} className={`${GeistSans.variable} ${GeistMono.variable}`}>
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
