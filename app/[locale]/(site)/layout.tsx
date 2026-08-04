import { getDictionary, type Locale } from '@/content'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SkipLink } from '@/components/layout/SkipLink'

// Escopo de layout separado (route group `(site)`, invisível na URL) das
// rotas `og/[slug]` e `cv` — que vivem direto sob `app/[locale]/`, fora
// deste grupo. Cabeçalho, rodapé e skip-link são cromo de navegação que só
// faz sentido nas páginas públicas (home e case studies); a imagem OG
// fotografada pelo Playwright e o CV para impressão precisam do documento
// limpo, só com o que `app/[locale]/layout.tsx` (html/body/fontes/JSON-LD)
// já garante.
export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <>
      <SkipLink label={dict.a11y.skipToContent} />
      <Header locale={locale} dict={dict} />
      <main id="conteudo">{children}</main>
      <Footer locale={locale} dict={dict} />
    </>
  )
}
