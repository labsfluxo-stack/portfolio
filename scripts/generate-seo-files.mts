import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pt } from '../content/pt.ts'
import { en } from '../content/en.ts'
import { locales, SYSTEM_SLUGS, type Dictionary, type Locale, type SystemSlug } from '../content/types.ts'

// Roda depois de `next build` (ver package.json), escrevendo em `out/` os
// três arquivos que fecham o portão de GEO (Task 14, spec §7.4-7.5):
// sitemap.xml e robots.txt para os buscadores tradicionais, llms.txt como
// mapa do site em texto para agentes de IA. Importa os dicionários direto
// (com extensão `.ts` explícita: este script roda com
// `node --experimental-strip-types`, resolução ESM nativa do Node, sem o
// bundler do Next por trás — o alias `@/*` do tsconfig não existe aqui),
// então gerar as três coisas juntas garante que nunca saem de sincronia
// entre si nem com o conteúdo real do site.

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://labsfluxo-stack.github.io'
const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}`

const OUT = join(process.cwd(), 'out')

const dicts = { pt, en } as const

// Mesmo mapeamento de lib/seo.ts (HREFLANG) — duplicado aqui de propósito:
// este script roda fora do grafo de módulos do Next (resolução ESM nativa
// do Node, sem o alias `@/*`), então importar de `lib/seo.ts` exigiria
// resolver as próprias dependências desse arquivo pela mesma via, incluindo
// `next` (que não roda fora do build do Next). Duas constantes, não duas
// decisões: se o par pt/en mudar, é o único outro lugar a atualizar.
const HREFLANG: Record<Locale, string> = { pt: 'pt-BR', en: 'en' }

function routeUrl(locale: Locale, path: string): string {
  return `${SITE_URL}/${locale}${path}/`
}

// Rotas públicas: home, os 3 case studies e a landing de captação, nos dois
// idiomas. `/cv` e `/og` são artefato de build (noindex, sem link de
// navegação, spec §5.2) e nunca entram aqui.
//
// FONTE ÚNICA para sitemap.xml E llms.txt (fix de revisão, Task 10): antes,
// `buildLlmsTxt` mantinha o próprio laço sobre `SYSTEM_SLUGS` + home, sem
// passar por `PATHS` — resultado, `/projetos` entrava no sitemap mas nunca
// no llms.txt, quebrando a garantia que o comentário do topo deste arquivo
// promete ("as três coisas juntas... nunca saem de sincronia"). Mesma classe
// de defeito que a Task 12 existe pra matar (duas listas que deviam ser uma).
const PATHS: string[] = [
  '',
  '/projetos',
  '/ativacoes',
  ...SYSTEM_SLUGS.map((slug) => `/sistemas/${slug}`),
]

function buildSitemap(): string {
  const entries = locales.flatMap((locale) =>
    PATHS.map((path) => {
      const alternates = locales
        .map((l) => `    <xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${routeUrl(l, path)}" />`)
        .join('\n')
      return `  <url>\n    <loc>${routeUrl(locale, path)}</loc>\n${alternates}\n  </url>`
    }),
  )

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n')
}

function buildRobots(): string {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n')
}

/**
 * Par (nome, descrição) de uma rota de `PATHS`, para um `Dictionary` de um
 * locale. Só existem quatro formatos de rota em `PATHS` hoje (home, a landing
 * de captação, a landing de ativações, um case study) — os três primeiros são
 * casos fixos, o quarto é o único que varia por dado (`SYSTEM_SLUGS`). Nome e
 * descrição SEMPRE vêm de um campo que já existe no dicionário (mesmo par que
 * `generateMetadata` de cada rota usa) — nunca um texto novo escrito aqui.
 */
function entryFor(d: Dictionary, path: string): { label: string; description: string } {
  if (path === '') return { label: d.hero.name, description: d.meta.description }
  if (path === '/projetos') return { label: d.landing.meta.title, description: d.landing.meta.description }
  if (path === '/ativacoes') {
    return { label: d.ativacoes.meta.title, description: d.ativacoes.meta.description }
  }
  const slug = path.replace('/sistemas/', '') as SystemSlug
  const cs = d.systems.detail[slug]
  return { label: cs.name, description: cs.tagline }
}

/**
 * Mapa do site em texto para agentes de IA (spec §7.4): título, resumo e uma
 * lista de links com uma linha de descrição cada, nos dois idiomas. Itera
 * `PATHS` — a MESMA lista que `buildSitemap` usa, não uma lista própria: era
 * exatamente aí que `/projetos` ficava de fora do llms.txt mesmo já estando
 * no sitemap (achado da revisão da Task 10). Os cabeçalhos de seção usam o
 * código `hreflang` (pt-BR/en), não um nome de idioma inventado que não
 * existe em nenhum `Dictionary`.
 */
function buildLlmsTxt(): string {
  const lines: string[] = [
    `# ${pt.hero.name}`,
    '',
    `> ${pt.meta.description}`,
    `> ${en.meta.description}`,
    '',
  ]

  for (const locale of locales) {
    const d = dicts[locale]
    lines.push(`## ${HREFLANG[locale]}`)
    for (const path of PATHS) {
      const { label, description } = entryFor(d, path)
      lines.push(`- [${label}](${routeUrl(locale, path)}): ${description}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

writeFileSync(join(OUT, 'sitemap.xml'), buildSitemap(), 'utf8')
writeFileSync(join(OUT, 'robots.txt'), buildRobots(), 'utf8')
writeFileSync(join(OUT, 'llms.txt'), buildLlmsTxt(), 'utf8')

console.log('seo files -> out/sitemap.xml, out/robots.txt, out/llms.txt')
