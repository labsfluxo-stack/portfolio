import type { Metadata } from 'next'
import {
  getDictionary,
  locales,
  systems,
  SYSTEM_SLUGS,
  OG_SLUGS,
  type Dictionary,
  type Locale,
  type SystemSlug,
  type OgSlug,
} from '@/content'
import type { System } from '@/content/systems'
import { formatNumber } from '@/lib/format'
import { StatusBadge } from '@/components/ui/StatusBadge'

// A lista de slugs (`home`, os 3 sistemas, a landing) mora em
// `content/og.ts`, não aqui: `scripts/generate-og.mts` roda com
// `node --experimental-strip-types`, que não sabe carregar `.tsx` (falha
// antes mesmo de chegar nos colchetes do caminho desta rota). Um módulo
// `.ts` neutro é o único jeito dos dois lados importarem a MESMA lista em
// vez de cada um manter a própria cópia. Ver tests/unit/og-slugs.test.ts.

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

  // ANTES de cair no branch de sistema OU no de home: 'projetos' não é slug
  // de sistema (`isSystemSlug` devolveria falso) e caía direto em `OgHome`,
  // que é o card ESCURO do recrutador. Achado I1 (Important) da revisão
  // final de branch: o preview no WhatsApp — o único canal que esta página
  // existe para alimentar — mostrava "Neto Alves / Arquiteto de software"
  // sobre "5 em produção" antes de a visita chegar numa página que fala outra
  // coisa. Confirmado por md5: pt-projetos.png e pt-home.png eram o MESMO
  // arquivo.
  if (slug === 'ativacoes') return <OgAtivacoes dict={dict} />

  if (slug === 'projetos') return <OgLanding dict={dict} />

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

/**
 * Card OG da landing de captação (/[locale]/projetos) — POLARIDADE INVERTIDA
 * (`bg-paper`/`text-ink`, papel claro e tinta escura: `#F5F3EF` sobre
 * `#08090C`), a mesma virada que `app/[locale]/projetos/layout.tsx` já faz na
 * própria rota. Sem isto o card cai no branch de `OgHome`, escuro — ver o
 * comentário acima de `OgImagePage`.
 *
 * Mostra a identidade DA LANDING, não a do portfólio: `hero.titulo` e
 * `hero.assinatura` de `dict.landing`, não `dict.hero`. É também o que faz o
 * card ficar visualmente distinto numa conversa de WhatsApp, onde todo outro
 * preview de link deste site é escuro.
 */
function OgLanding({ dict }: { dict: Dictionary }) {
  const { hero, landing } = dict

  return (
    <div className="relative flex h-[630px] w-[1200px] flex-col justify-between overflow-hidden bg-paper p-16">
      <div className="flex flex-col gap-6">
        <p className="font-mono text-lg uppercase tracking-[0.3em] text-ink-2">{hero.name}</p>
        <h1 className="max-w-4xl font-sans text-7xl font-bold leading-[1.05] tracking-tight text-ink">
          {landing.hero.titulo}
        </h1>
      </div>
      <p className="max-w-3xl text-2xl leading-snug text-ink-2">{landing.hero.assinatura}</p>
    </div>
  )
}

/**
 * Card ESCURO, ao contrário do `OgLanding`: esta rota não inverte polaridade, e
 * o preview precisa parecer a página que a pessoa vai abrir. A serifa do título
 * é o que diferencia os dois cards escuros — o da home usa sans.
 */
function OgAtivacoes({ dict }: { dict: Dictionary }) {
  const { hero, ativacoes } = dict

  return (
    <div className="relative flex h-[630px] w-[1200px] flex-col justify-between overflow-hidden bg-bg p-16">
      <div className="flex flex-col gap-6">
        <p className="font-mono text-lg uppercase tracking-[0.3em] text-muted">{hero.name}</p>
        <h1 className="max-w-4xl font-serif text-7xl leading-[1.05] tracking-tight text-text">
          {ativacoes.capa.titulo} <em className="text-data">{ativacoes.capa.tituloDestaque}</em>
        </h1>
      </div>
      <p className="max-w-3xl text-2xl leading-snug text-muted">{ativacoes.capa.subtitulo}</p>
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
