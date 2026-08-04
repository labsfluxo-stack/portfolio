import { getDictionary, type Locale } from '@/content'
import { Boot } from '@/components/sections/Boot'
import { Hero } from '@/components/sections/Hero'
import { Telemetry } from '@/components/sections/Telemetry'
import { About } from '@/components/sections/About'
import { Systems } from '@/components/sections/Systems'
import { Stack } from '@/components/sections/Stack'
import { Terminal } from '@/components/sections/Terminal'

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const dict = getDictionary(locale)
  return (
    <>
      <Boot dict={dict} locale={locale} />
      <Hero dict={dict} locale={locale} />
      <Telemetry dict={dict} locale={locale} />
      <About dict={dict} locale={locale} />
      <Systems dict={dict} locale={locale} />
      <Stack dict={dict} locale={locale} />
      <Terminal dict={dict} locale={locale} />
    </>
  )
}
