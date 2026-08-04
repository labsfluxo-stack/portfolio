import type { Metadata } from 'next'
import { getDictionary, locales, systems, SYSTEM_SLUGS, type Locale, type SystemSlug } from '@/content'
import { CaseStudy } from '@/components/sections/CaseStudy'
import { buildMetadata } from '@/lib/seo'
import { caseStudyJsonLd } from '@/lib/jsonld'

// Export estático (`output: 'export'`): as 6 páginas (locales × SYSTEM_SLUGS)
// precisam existir de antemão — nenhuma rota fora dessa lista é servida.
export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((locale) => SYSTEM_SLUGS.map((slug) => ({ locale, slug })))
}

// Sobrescreve por inteiro a metadata da home herdada de
// app/[locale]/layout.tsx — título, descrição e imagem OG próprios do case
// study, nunca os da home vazando para cá.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: SystemSlug }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const dict = getDictionary(locale)
  const caseStudy = dict.systems.detail[slug]
  return buildMetadata(locale, {
    title: `${caseStudy.name} — ${dict.meta.title}`,
    description: caseStudy.tagline,
    path: `/sistemas/${slug}`,
    ogImage: `/og/${locale}-${slug}.png`,
    imageAlt: caseStudy.tagline,
  })
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: SystemSlug }>
}) {
  const { locale, slug } = await params
  const dict = getDictionary(locale)
  const system = systems.find((candidate) => candidate.slug === slug)
  // `dynamicParams = false` + `generateStaticParams` acima garantem que todo
  // `slug` que chega aqui já existe em `content/systems.ts` — se isto disparar,
  // é a lista de slugs saindo de sincronia com `SYSTEM_SLUGS`, um bug de
  // configuração, não uma URL de visitante mal formada (que o Next já
  // rejeitaria antes de renderizar, via `dynamicParams = false`).
  if (!system) throw new Error(`sistema desconhecido: ${slug}`)

  const jsonLd = caseStudyJsonLd(locale, dict.systems.detail[slug], slug)

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CaseStudy system={system} dict={dict} locale={locale} />
    </>
  )
}
