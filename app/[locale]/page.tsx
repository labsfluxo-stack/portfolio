import { getDictionary, type Locale } from '@/content'
import { Boot } from '@/components/sections/Boot'
import { Hero } from '@/components/sections/Hero'
import { Telemetry } from '@/components/sections/Telemetry'
import { About } from '@/components/sections/About'

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)
  return (
    <>
      <Boot dict={dict} locale={locale} />
      <Hero dict={dict} locale={locale} />
      <Telemetry dict={dict} locale={locale} />
      <About dict={dict} locale={locale} />
    </>
  )
}
