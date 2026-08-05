import Link from 'next/link'
import type { System } from '@/content/systems'
import type { Dictionary, Locale } from '@/content/types'
import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Counter } from '@/components/ui/Counter'

/**
 * Corpo inteiro da rota `app/[locale]/sistemas/[slug]/page.tsx` — não é uma
 * `<Section>` de página única como as da home, é o documento inteiro. Único
 * `<h1>` da página é o nome do sistema; as cinco seções internas (problema,
 * arquitetura, decisões, stack, retro) usam o mesmo primitivo `Section` da
 * home, que já gera `<h2>` — nunca reintroduzir um `<h1>` lá dentro.
 *
 * Para os dois sistemas proprietários (OSCapstack, Saturno Labs) este é o
 * único material que existe: não há repositório para abrir, nem demo para
 * clicar. `caseStudy.decisions` é por isso o coração da página — quatro
 * blocos autônomos com o tratamento tipográfico mais forte depois do `<h1>`
 * (título maior que qualquer outro heading de nível 3 do site).
 */
export function CaseStudy({
  system,
  dict,
  locale,
}: {
  system: System
  dict: Dictionary
  locale: Locale
}) {
  const { systems } = dict
  const caseStudy = systems.detail[system.slug]

  return (
    <article>
      <header>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-24 sm:py-32">
          <Link prefetch={false}
            href={`/${locale}`}
            className="self-start font-mono text-[11px] uppercase tracking-widest text-muted underline decoration-border underline-offset-4 hover:text-text hover:decoration-text"
          >
            {systems.caseLabels.backToHome}
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="font-sans text-5xl font-bold leading-[1.05] tracking-tight text-text sm:text-6xl">
                {system.name}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted sm:text-xl">{caseStudy.tagline}</p>
            </div>
            {/* Os mesmos dois eixos independentes do card na home
             * (SystemCard.tsx): `production` e `proprietary` nunca formam um
             * único campo de status, e um sistema pode exibir os dois, um
             * só, ou nenhum. */}
            <div className="flex flex-wrap gap-2">
              {system.production ? <StatusBadge status="ok" label={systems.statusLabels.production} /> : null}
              {system.proprietary ? <StatusBadge status="warn" label={systems.statusLabels.proprietary} /> : null}
            </div>
          </div>

          {/* Mesma disciplina de grid do SystemCard: `min-w-0` em cada célula
           * e `gap-x-6` explícito, senão um número de 6 dígitos com
           * separador de milhar (78.900) colide com o rótulo vizinho — o
           * `min-width: auto` padrão de item de grid já produziu esse blob
           * ilegível uma vez neste projeto. Números maiores que no card
           * (text-4xl vs text-lg) porque aqui eles são o conteúdo principal
           * da dobra, não um coadjuvante ao lado do nome do sistema. */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 border-t border-border pt-8 sm:grid-cols-4">
            {system.metrics.map((metric) => (
              <div key={metric.key} className="min-w-0">
                <dt className="min-h-8 font-mono text-[10px] uppercase leading-4 tracking-widest text-muted">
                  {systems.metricLabels[metric.key]}
                </dt>
                {/* `metric.value` é número de propósito — nunca `String(metric.value)`
                 * aqui, ou o separador de milhar sai errado em `en`. */}
                <dd className="mt-1 font-sans text-3xl font-bold tabular-nums text-text sm:text-4xl">
                  <Counter to={metric.value} locale={locale} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <Section id="problema" label={systems.caseLabels.problem} index="01">
        <p className="max-w-3xl text-lg leading-relaxed text-muted">{caseStudy.problem}</p>
      </Section>

      <Section id="arquitetura" label={systems.caseLabels.architecture} index="02">
        <p className="max-w-3xl text-lg leading-relaxed text-muted">{caseStudy.architecture}</p>
      </Section>

      {/* As quatro decisões são o coração da página (ver comentário acima do
       * componente): título em text-2xl/3xl, o maior heading de nível 3 do
       * site inteiro (o do SystemCard fica em text-xl). O numeral decorativo
       * (01–04) é `aria-hidden` e nunca um texto de interface — é dígito
       * puro, idêntico nos dois idiomas, na mesma linguagem visual do índice
       * de `Section` (`index="01"` etc.), nunca uma palavra inventada como
       * "Decisão". */}
      <Section id="decisoes" label={systems.caseLabels.decisions} index="03">
        <div className="grid gap-6 lg:grid-cols-2">
          {caseStudy.decisions.map((decision, i) => (
            <article key={decision.title} className="border border-border bg-surface p-6 sm:p-8">
              <p aria-hidden="true" className="font-mono text-[11px] text-muted">
                {String(i + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-3 font-sans text-2xl font-bold leading-snug text-text sm:text-3xl">
                {decision.title}
              </h3>
              <p className="mt-4 leading-relaxed text-muted">{decision.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="stack" label={systems.caseLabels.stack} index="04">
        <div className="flex flex-col gap-6">
          <ul className="flex flex-wrap gap-2">
            {caseStudy.stack.map((tech) => (
              <li
                key={tech}
                className="border border-border bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-text"
              >
                {tech}
              </li>
            ))}
          </ul>

          {/* Sistema proprietário: sem screenshot, sem trecho de código, sem
           * link de repositório — mostra `proprietaryNote` no lugar. Um
           * sistema não proprietário sem `repoUrl` (nenhum hoje) não mostra
           * nada aqui, igual ao SystemCard. */}
          {system.repoUrl ? (
            <a
              href={system.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="self-start font-mono text-[11px] uppercase tracking-widest text-text underline decoration-border underline-offset-4 hover:decoration-text"
            >
              {systems.viewRepo}
            </a>
          ) : system.proprietary ? (
            <p className="font-mono text-[11px] text-muted">{systems.proprietaryNote}</p>
          ) : null}
        </div>
      </Section>

      <Section id="retro" label={systems.caseLabels.retro} index="05">
        <p className="max-w-3xl text-lg leading-relaxed text-muted">{caseStudy.retro}</p>
      </Section>
    </article>
  )
}
