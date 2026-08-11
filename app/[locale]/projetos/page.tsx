import { getDictionary, type Locale } from '@/content'

export const dynamicParams = false

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params
  const dict = getDictionary(locale)
  // As seções entram nas tarefas seguintes; por ora só o suficiente para a
  // rota existir e o teste de polaridade ter o que medir.
  return <h1 className="px-6 py-20 text-4xl font-bold text-ink">{dict.meta.title}</h1>
}
