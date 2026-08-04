import type { Dictionary, Locale } from '@/content/types'
import { systems } from '@/content/systems'
import { Section } from '@/components/ui/Section'
import { SystemCard } from './SystemCard'

/** Três cards grandes, um por `System` (content/systems.ts) — números
 * neutros de idioma, badges e rótulos vêm todos de `dict.systems`. */
export function Systems({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  return (
    <Section id="sistemas" label={dict.systems.label} index="03">
      <div className="grid gap-6 lg:grid-cols-3">
        {systems.map((system) => (
          <SystemCard key={system.slug} system={system} dict={dict} locale={locale} />
        ))}
      </div>
    </Section>
  )
}
