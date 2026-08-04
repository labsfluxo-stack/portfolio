import type { Metadata } from 'next'
import { getDictionary, locales, systems, SYSTEM_SLUGS, type Dictionary, type Locale, type SystemSlug } from '@/content'
import type { System } from '@/content/systems'
import { formatNumber } from '@/lib/format'
import { StatusBadge } from '@/components/ui/StatusBadge'

// `home` + os 3 sistemas — os "4 alvos" da Task 14 (spec §7.2). Vive fora do
// route group `(site)`: esta página não leva Header/Footer, só o que
// app/[locale]/layout.tsx garante (html/body/fontes), porque o Playwright
// (scripts/generate-og.mts) fotografa exatamente 1200×630 e cromo de
// navegação não cabe — nem faz sentido — num card de Open Graph.
const OG_SLUGS = ['home', ...SYSTEM_SLUGS] as const
type OgSlug = (typeof OG_SLUGS)[number]

export const dynamicParams = false

export function generateStaticParams() {
  return locales.flatMap((locale) => OG_SLUGS.map((slug) => ({ locale, slug })))
}

// Artefato de build: o Playwright é o único "visitante" desta rota, que
// nunca aparece em busca nem no sitemap (scripts/generate-seo-files.mts).
// Sobrescreve por inteiro a metadata indexável herdada da home.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: OgSlug }>
}): Promise<Metadata> {
  const { locale } = await params
  const dict = getDictionary(locale)
  return { title: dict.meta.title, robots: { index: false, follow: false } }
}

function isSystemSlug(slug: OgSlug): slug is SystemSlug {
  return (SYSTEM_SLUGS as readonly string[]).includes(slug)
}

export default async function OgImagePage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: OgSlug }>
}) {
  const { locale, slug } = await params
  const dict = getDictionary(locale)

  if (!isSystemSlug(slug)) return <OgHome dict={dict} />

  const system = systems.find((candidate) => candidate.slug === slug)
  // Mesma garantia de `sistemas/[slug]/page.tsx`: `dynamicParams = false` +
  // `generateStaticParams` acima já limitam `slug` a `SYSTEM_SLUGS`.
  if (!system) throw new Error(`sistema desconhecido: ${slug}`)
  return <OgCaseStudy system={system} dict={dict} locale={locale} />
}

/** Card OG da home: nome, cargo, tagline e os 4 números canônicos da
 * Telemetria — os mesmos que abrem o site. */
function OgHome({ dict }: { dict: Dictionary }) {
  const { hero, telemetry } = dict

  return (
    <div className="relative flex h-[630px] w-[1200px] flex-col justify-between overflow-hidden bg-bg p-16">
      {/* Grid técnico decorativo (app/globals.css) — definido desde o
       * início do projeto mas ainda sem consumidor (reservado para a cena
       * da Task 13). Aqui preenche o respiro entre o bloco de identidade e
       * a fita de métricas com a mesma assinatura visual "sala de
       * controle" do resto do site, sem introduzir cor nova. */}
      <div aria-hidden="true" className="grid-tecnico absolute inset-0" />
      <div className="relative flex flex-col gap-6">
        <p className="font-mono text-lg uppercase tracking-[0.3em] text-muted">{hero.role}</p>
        <h1 className="font-sans text-8xl font-bold leading-[1.02] tracking-tight text-text">{hero.name}</h1>
        <p className="max-w-3xl text-2xl leading-snug text-muted">{hero.tagline}</p>
      </div>

      {/* `min-w-0` + `gap-8` explícito: a mesma disciplina de grid de
       * CaseStudy.tsx e SystemCard.tsx — sem isso um número com separador de
       * milhar colide com o rótulo vizinho. */}
      <dl className="relative grid grid-cols-4 gap-8 border-t border-border pt-8">
        {telemetry.metrics.map((metric) => (
          <div key={metric.key} className="min-w-0">
            <dt className="font-mono text-xs uppercase tracking-widest text-muted">{metric.label}</dt>
            {/* `metric.value` já vem formatado por locale do dicionário —
             * nunca `String(metric.numeric)` aqui. */}
            <dd className="mt-2 font-sans text-4xl font-bold tabular-nums text-text">{metric.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** Card OG de um case study: nome, tagline, badges de status e 4 métricas do
 * sistema, com a mesma marca pessoal ao rodapé dos cards da home. */
function OgCaseStudy({ system, dict, locale }: { system: System; dict: Dictionary; locale: Locale }) {
  const caseStudy = dict.systems.detail[system.slug]

  return (
    <div className="relative flex h-[630px] w-[1200px] flex-col justify-between overflow-hidden bg-bg p-16">
      {/* Mesmo grid técnico decorativo do card da home — ver comentário em
       * `OgHome` acima. */}
      <div aria-hidden="true" className="grid-tecnico absolute inset-0" />
      <div className="relative flex items-start justify-between gap-8">
        <div className="flex max-w-3xl flex-col gap-6">
          <p className="font-mono text-lg uppercase tracking-[0.3em] text-muted">{dict.systems.label}</p>
          <h1 className="font-sans text-7xl font-bold leading-[1.03] tracking-tight text-text">{caseStudy.name}</h1>
          <p className="text-2xl leading-snug text-muted">{caseStudy.tagline}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {system.production ? <StatusBadge status="ok" label={dict.systems.statusLabels.production} /> : null}
          {system.proprietary ? <StatusBadge status="warn" label={dict.systems.statusLabels.proprietary} /> : null}
        </div>
      </div>

      <div className="relative flex items-end justify-between gap-8 border-t border-border pt-8">
        <dl className="grid grid-cols-4 gap-8">
          {system.metrics.map((metric) => (
            <div key={metric.key} className="min-w-0">
              <dt className="font-mono text-xs uppercase tracking-widest text-muted">
                {dict.systems.metricLabels[metric.key]}
              </dt>
              {/* Aqui `metric.value` é número puro (content/systems.ts) —
               * `formatNumber`, nunca `String(metric.value)`, ou o
               * separador de milhar sai errado em `en`. */}
              <dd className="mt-2 font-sans text-3xl font-bold tabular-nums text-text">
                {formatNumber(metric.value, locale)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="whitespace-nowrap font-mono text-sm uppercase tracking-widest text-muted">{dict.hero.name}</p>
      </div>
    </div>
  )
}
