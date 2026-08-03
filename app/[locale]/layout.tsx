import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { getDictionary, locales, type Locale } from '@/content'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SkipLink } from '@/components/layout/SkipLink'

export const dynamicParams = false

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

const HTML_LANG: Record<Locale, string> = { pt: 'pt-BR', en: 'en' }

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <html lang={HTML_LANG[locale]} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh">
        <SkipLink label={dict.a11y.skipToContent} />
        <Header locale={locale} dict={dict} />
        <main id="conteudo">{children}</main>
        <Footer locale={locale} dict={dict} />
      </body>
    </html>
  )
}
