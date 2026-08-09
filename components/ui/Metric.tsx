import { Counter } from './Counter'
import type { Locale } from '@/content/types'

export function Metric({
  value,
  label,
  provenance,
  locale,
  numeric,
  suffix,
}: {
  value: string
  label: string
  provenance: string
  locale: Locale
  numeric?: number
  suffix?: string
}) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="font-sans text-4xl font-bold tabular-nums" title={provenance}>
        {numeric !== undefined ? <Counter to={numeric} locale={locale} suffix={suffix} /> : value}
      </div>
      <div className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted">
        {label}
      </div>
      {/* A procedência VIVIA AQUI, como parágrafo debaixo de cada número, e
       * saiu. Não por ser irrelevante — ela continua inteira no `title` logo
       * acima, e a seção declara de uma vez só de onde os números vêm (ver
       * `telemetry.provenanceNote`). Saiu porque nove justificativas na mesma
       * tela não leem como rigor: leem como quem precisa provar que sabe. Um
       * profissional afirma o número; quem explica cada um deles parece se
       * defender de uma acusação que ninguém fez.
       *
       * Ter a prova e exibi-la o tempo todo são coisas diferentes, e é a
       * primeira que importa. */}
    </div>
  )
}
