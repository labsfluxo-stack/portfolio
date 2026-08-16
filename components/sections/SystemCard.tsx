import Link from 'next/link'
import type { System } from '@/content/systems'
import type { Dictionary, Locale } from '@/content/types'
import { StatusBadge } from '@/components/ui/StatusBadge'

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
    <article className="brilho-borda flex flex-col gap-6 border border-border bg-surface p-6 transition-colors duration-300 hover:border-faint hover:bg-surface-2">
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

      {/* O QUE O SISTEMA MUDOU PARA A EMPRESA — no lugar onde ficavam as
       * métricas técnicas (146 RLS policies, 14 packages, 40 models).
       *
       * A troca é de público. Contagem de tabela e de package responde à
       * pergunta de um recrutador, e a home é onde um dono de negócio decide
       * se continua lendo. Os números não sumiram: vivem no cabeçalho do
       * case study e na Telemetria, uma rolagem abaixo. O funil ficou
       * resultado na home, profundidade técnica para quem clicar atrás dela.
       *
       * O quadradinho é decoração (`aria-hidden`), e usa `bg-faint` porque
       * aí `--color-faint` é legítimo: forma, não palavra. */}
      <ul className="flex flex-col gap-2.5 border-t border-border pt-5">
        {systems.detail[system.slug].improvements.map((melhoria) => (
          <li key={melhoria} className="flex gap-3 text-sm leading-relaxed text-muted">
            <span aria-hidden="true" className="mt-[0.5rem] size-1 shrink-0 bg-faint" />
            {melhoria}
          </li>
        ))}
      </ul>

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
