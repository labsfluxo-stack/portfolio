import { getDictionary, type Locale } from '@/content'

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)
  return <h1 className="px-6 py-24 text-5xl font-bold">{dict.hero.name}</h1>
}
