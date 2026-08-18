import type { Metadata } from 'next'
import { getDictionary, locales, type Locale } from '@/content'
import { buildMetadata } from '@/lib/seo'

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

export default async function AtivacoesPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const dict = getDictionary(locale)

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-20">
      <h1 className="font-serif text-5xl tracking-tight text-text sm:text-7xl">
        {dict.ativacoes.capa.titulo}{' '}
        <em className="text-data">{dict.ativacoes.capa.tituloDestaque}</em>
      </h1>
      <p className="max-w-2xl text-[17px] leading-relaxed text-muted">
        {dict.ativacoes.capa.subtitulo}
      </p>
    </section>
  )
}
