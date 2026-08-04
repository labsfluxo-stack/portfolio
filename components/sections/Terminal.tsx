'use client'
import dynamic from 'next/dynamic'
import type { Dictionary, Locale } from '@/content/types'
import { systems } from '@/content/systems'
import { Section } from '@/components/ui/Section'
import { COMMAND_NAMES } from '@/components/terminal/commands'

// `ssr: false` só é permitido a partir de um Client Component (App Router) —
// por isso este arquivo carrega `'use client'`. Isso não tira a `<dl>`
// abaixo do HTML estático: no export, um Client Component ainda é
// renderizado no build, só ganha hidratação depois. Quem sai de fato do
// HTML inicial é só a ilha interativa, que é exatamente o ponto.
const TerminalIsland = dynamic(
  () => import('@/components/terminal/TerminalIsland').then((mod) => mod.TerminalIsland),
  { ssr: false },
)

// `clear` não informa nada — só apaga a tela. A `<dl>` existe para
// duplicar INFORMAÇÃO (spec §6.7); um comando sem resposta não tem o que
// duplicar em HTML, então fica fora desta lista de propósito.
const DL_COMMANDS = COMMAND_NAMES.filter((name) => name !== 'clear')

/**
 * Seção full-bleed: o terminal interativo (ilha só-cliente, Task 10) e,
 * logo abaixo, a mesma informação em HTML estático — uma `<dl>` com cada
 * comando e a resposta que ele devolve. GPTBot, ClaudeBot e PerplexityBot
 * não executam JavaScript; um crawler desses, ou um visitante que nunca
 * toca o terminal, lê exatamente o mesmo conteúdo aqui embaixo. Isso é o
 * que permite ao terminal existir sem virar a única fonte de nenhuma
 * informação do site.
 */
export function Terminal({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { terminal } = dict

  return (
    <Section id="terminal" label={terminal.label} index="05">
      <p className="max-w-2xl text-muted">{terminal.lead}</p>

      <div className="mt-10">
        <TerminalIsland dict={dict} locale={locale} systems={systems} />
      </div>

      <dl className="mt-10 grid gap-x-8 gap-y-6 border-t border-border pt-8 sm:grid-cols-2">
        {DL_COMMANDS.map((command) => (
          <div key={command}>
            <dt className="font-mono text-[11px] uppercase tracking-widest text-text">{command}</dt>
            <dd className="mt-1 font-mono text-[12px] leading-relaxed text-muted">
              {(terminal.responses[command] ?? []).join(' ')}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
