import Link from 'next/link'
import type { System } from '@/content/systems'
import type { Dictionary, Locale } from '@/content/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Counter } from '@/components/ui/Counter'

/**
 * `production` e `proprietary` são dois eixos independentes — um sistema
 * pode exibir os dois badges, um só, ou nenhum. Não existe mais um campo
 * `status` único; nunca reintroduzir essa leitura aqui.
 *
 * O link de repositório só aparece quando `repoUrl` existe. Um sistema
 * `proprietary` sem `repoUrl` não fica com link morto nem botão desabilitado
 * — no lugar entra `dict.systems.proprietaryNote`, a explicação de por que
 * não há código para mostrar.
 */
export function SystemCard({
  system,
  dict,
  locale,
}: {
  system: System
  dict: Dictionary
  locale: Locale
}) {
  const { systems } = dict
  const repoLabel = system.repoUrl?.replace(/^https?:\/\//, '')

  return (
    <article className="flex flex-col gap-6 border border-border bg-surface p-6 transition-colors duration-300 hover:border-faint hover:bg-surface-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-sans text-xl font-bold text-text">{system.name}</h3>
        <div className="flex flex-wrap gap-2">
          {system.production ? (
            <StatusBadge status="ok" label={systems.statusLabels.production} />
          ) : null}
          {system.proprietary ? (
            <StatusBadge status="warn" label={systems.statusLabels.proprietary} />
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-4">
        {system.metrics.map((metric) => (
          <div key={metric.key}>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {systems.metricLabels[metric.key]}
            </dt>
            {/* `metric.value` é número de propósito — nunca `String(metric.value)`
             * aqui, ou o separador de milhar sai errado em `en`. */}
            <dd className="mt-1 font-sans text-2xl font-bold tabular-nums text-text">
              <Counter to={metric.value} locale={locale} />
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
        <Link
          href={`/${locale}/sistemas/${system.slug}`}
          className="font-mono text-[11px] uppercase tracking-widest text-text underline decoration-border underline-offset-4 hover:decoration-text"
        >
          {systems.readCase}
        </Link>

        {system.repoUrl ? (
          <a
            href={system.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] text-muted hover:text-text"
          >
            {repoLabel}
          </a>
        ) : system.proprietary ? (
          <p className="font-mono text-[11px] text-faint">{systems.proprietaryNote}</p>
        ) : null}
      </div>
    </article>
  )
}
