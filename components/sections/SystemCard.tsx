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
 * — o slot fica vazio, porque o selo "Proprietário" no topo do card já
 * diz isso, e repetir em prosa vira justificativa.
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

      {/* O que o sistema É, em uma frase. O card não trazia isto: mostrava
       * nome, selos e quatro números, e um visitante que não conhecesse
       * "OSCapstack CRM" saía sem saber do que se tratava. É a linha que
       * atende quem lê a página para decidir contratar, enquanto os números
       * logo abaixo atendem quem lê para avaliar profundidade técnica —
       * mesmo card, dois públicos.
       *
       * O texto já existia em `systems.detail[slug].tagline` e era usado só
       * no CV e no topo do case study. */}
      <p className="text-sm leading-relaxed text-muted">{systems.detail[system.slug].tagline}</p>

      {/* Duas colunas fixas em qualquer largura: com três cards lado a lado
       * no desktop, uma célula de métrica raramente tem mais de ~150px, e um
       * rótulo de duas palavras como "RLS POLICIES" não cabe em mais colunas
       * sem transbordar por cima do vizinho (`min-width: auto` é o padrão em
       * item de grid — por isso `min-w-0` aqui). `min-h-8` no rótulo reserva
       * a altura de duas linhas sempre, então um rótulo que quebra nunca
       * empurra só aquele valor para baixo e desalinha a grade. */}
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
        <Link prefetch={false}
          href={`/${locale}/sistemas/${system.slug}`}
          className="font-mono text-[11px] uppercase tracking-widest text-text underline decoration-border underline-offset-4 hover:decoration-text"
        >
          {systems.readCase}
        </Link>

        {/* Sem repositório público, o slot fica VAZIO. Antes ele trazia
         * "Código proprietário — sem repositório público.", que repetia o
         * selo PROPRIETÁRIO exibido no topo do mesmo card: a mesma
         * informação duas vezes, e a segunda em tom de justificativa. O selo
         * já diz, e não precisa de nota explicando. */}
        {system.repoUrl ? (
          <a
            href={system.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] text-muted hover:text-text"
          >
            {systems.viewRepo}
          </a>
        ) : null}
      </div>
    </article>
  )
}
