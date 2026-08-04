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

      {/* Duas colunas fixas em qualquer largura, não quatro: com três cards
       * lado a lado no desktop, uma célula de métrica raramente tem mais de
       * ~150px de largura, e um número de 6 dígitos com separador de milhar
       * (78.900) mais o rótulo "RLS POLICIES" não cabem em quatro colunas
       * dessa largura sem transbordar por cima do vizinho (`min-width: auto`
       * é o padrão em item de grid — por isso `min-w-0` aqui). `gap-x-6` é
       * deliberadamente maior que o `gap` padrão para garantir separação
       * visível mesmo com o maior número da seção. `min-h-8` no rótulo
       * reserva a altura de duas linhas sempre, então um rótulo de duas
       * palavras que quebra (como "RLS policies") nunca empurra só aquele
       * valor para baixo e desalinha a grade. */}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5">
        {system.metrics.map((metric) => (
          <div key={metric.key} className="min-w-0">
            <dt className="min-h-8 font-mono text-[10px] uppercase leading-4 tracking-widest text-muted">
              {systems.metricLabels[metric.key]}
            </dt>
            {/* `metric.value` é número de propósito — nunca `String(metric.value)`
             * aqui, ou o separador de milhar sai errado em `en`. Tamanho
             * menor que o dos números da Telemetria de propósito: aqui o
             * protagonista é o nome do sistema, não o número. */}
            <dd className="mt-1 font-sans text-lg font-bold tabular-nums text-text">
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
            {systems.viewRepo}
          </a>
        ) : system.proprietary ? (
          // Um degrau menor que `viewRepo` (10px vs 11px) em vez de uma cor mais
          // fraca: os dois nunca aparecem juntos (são alternativas no mesmo
          // slot), mas a nota é só um aviso inerte, não um link, e o tamanho
          // menor já sinaliza isso sem recorrer a `text-faint` (reprova AA).
          <p className="font-mono text-[10px] text-muted">{systems.proprietaryNote}</p>
        ) : null}
      </div>
    </article>
  )
}
