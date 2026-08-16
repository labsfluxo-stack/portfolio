import type { Dictionary, Locale } from '@/content/types'
import { systems } from '@/content/systems'
import { Section } from '@/components/ui/Section'
import { Reveal } from '@/components/ui/Reveal'
import { SystemCard } from './SystemCard'

/** Três cards grandes, um por `System` (content/systems.ts) — números
 * neutros de idioma, badges e rótulos vêm todos de `dict.systems`. */
export function Systems({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  return (
    <Section id="sistemas" label={dict.systems.label} index="02">
      {/* Era a única seção sem abertura — ia do rótulo direto para os cards.
       * O que ela diz também faltava no site inteiro: o que os sistemas
       * fazem por uma empresa, e não só como foram construídos (ver o
       * comentário em content/types.ts, systems.lead). */}
      <Reveal>
        <p className="mb-10 max-w-2xl text-muted">{dict.systems.lead}</p>
      </Reveal>
      <div className="grid gap-6 lg:grid-cols-3">
        {systems.map((system, i) => (
          // `className="grid"` repassa a largura e a altura esticadas pela
          // grade para o <article> do card (ver comentário em
          // components/ui/Reveal.tsx) — sem isso os três cards perdem a
          // altura uniforme na fileira.
          <Reveal key={system.slug} ordem={i} className="grid">
            <SystemCard system={system} dict={dict} locale={locale} />
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
