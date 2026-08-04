import { getDictionary, locales, systems, SYSTEM_SLUGS, type Locale, type SystemSlug } from '@/content'
import { CaseStudy } from '@/components/sections/CaseStudy'

// Export estático (`output: 'export'`): as 6 páginas (locales × SYSTEM_SLUGS)
// precisam existir de antemão — nenhuma rota fora dessa lista é servida.
export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((locale) => SYSTEM_SLUGS.map((slug) => ({ locale, slug })))
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

  return <CaseStudy system={system} dict={dict} locale={locale} />
}
