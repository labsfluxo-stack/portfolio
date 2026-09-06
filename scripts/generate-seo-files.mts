import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pt } from '../content/pt.ts'
import { en } from '../content/en.ts'
// `blog-textos.ts` é TypeScript puro, sem import de `.mdx` — por isso ele PODE
// ser importado aqui, ao contrário de `content/posts.ts`. É a mesma fonte que
// a página do blog usa para o título e a descrição, então o feed nunca
// descreve o blog de um jeito e a página de outro.
import { blogTextos } from '../content/blog-textos.ts'
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

/**
 * O BLOG SAI SÓ EM PORTUGUÊS (ver content/posts.ts), e por isso ele NÃO entra
 * em `PATHS`: aquela lista é percorrida uma vez por locale, e um `/blog` lá
 * geraria `/en/blog/` no sitemap e no llms.txt apontando para uma URL que o
 * build nunca emite.
 */
const LOCALE_DO_BLOG: Locale = 'pt'

type MetaDePost = {
  titulo: string
  descricao: string
  publicado: string
  atualizado?: string
  tags: readonly string[]
}

/**
 * OS ARTIGOS VÊM DO DIRETÓRIO, e não de `content/posts.ts`.
 *
 * Não é preferência: este script roda com `node --experimental-strip-types`,
 * resolução ESM nativa, sem o bundler do Next. `content/posts.ts` importa
 * arquivos `.mdx`, que o Node não sabe carregar — importá-lo aqui quebra o
 * build antes de escrever qualquer coisa.
 *
 * Isso cria justamente o risco que este arquivo já documenta odiar, duas linhas
 * acima de `PATHS`: duas listas que podem divergir. A trava é
 * `tests/blog-conteudo.test.ts`, que exige correspondência exata entre os
 * `.mdx` do diretório e o registro de `content/posts.ts`. Com essa igualdade
 * garantida por teste, ler o diretório aqui é ler a MESMA lista por outro
 * caminho — não uma segunda lista.
 *
 * O `meta` é extraído do próprio arquivo e avaliado como literal: é código do
 * repositório, escrito por quem publica, nunca entrada de usuário.
 */
function lerPosts(): { slug: string; meta: MetaDePost }[] {
  const pasta = join(process.cwd(), 'content', 'posts')
  return readdirSync(pasta)
    .filter((nome) => nome.endsWith('.mdx'))
    .map((nome) => {
      const bruto = readFileSync(join(pasta, nome), 'utf8')
      const bloco = /export const meta = (\{[\s\S]*?\n\})/m.exec(bruto)
      if (!bloco) throw new Error(`${nome}: não achei o bloco "export const meta = { ... }"`)
      const meta = new Function(`return ${bloco[1]}`)() as MetaDePost
      for (const campo of ['titulo', 'descricao', 'publicado'] as const) {
        if (!meta[campo]) throw new Error(`${nome}: meta.${campo} vazio ou ausente`)
      }
      return { slug: nome.replace(/\.mdx$/, ''), meta }
    })
    .sort((a, b) => b.meta.publicado.localeCompare(a.meta.publicado))
}

const posts = lerPosts()

/** A revisão, se houve; a publicação, se não. Mesma regra de content/posts.ts. */
function dataVigente(meta: MetaDePost): string {
  return meta.atualizado ?? meta.publicado
}

/** Escapa o que não pode entrar cru em XML — título de artigo tem `&` e aspas. */
function xml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

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
const PATHS: string[] = ['', '/projetos', ...SYSTEM_SLUGS.map((slug) => `/sistemas/${slug}`)]

/**
 * As rotas do blog, que são monolíngues e por isso NÃO passam por `PATHS`.
 * Índice primeiro, depois cada artigo do mais recente para o mais antigo.
 */
const PATHS_DO_BLOG: string[] = ['/blog', ...posts.map((p) => `/blog/${p.slug}`)]

/**
 * `<lastmod>` SÓ ONDE EXISTE UMA DATA DE VERDADE — ou seja, nos artigos.
 *
 * A auditoria de 2026-09-04 mediu o sitemap publicado e achou zero `lastmod`,
 * o que faz a checagem "o conteúdo está vivo" da própria ferramenta deste site
 * (workers/auditoria) devolver "sem data no sitemap" para o site dela mesma.
 *
 * A correção preguiçosa seria carimbar a data do build em todas as URLs. Seria
 * mentira: diria que a home e os três cases foram atualizados hoje, toda vez
 * que qualquer coisa subisse. `lastmod` é opcional por URL na especificação de
 * sitemap justamente para isso — declarar só onde se sabe.
 *
 * Os artigos sabem: `atualizado` se houve revisão, `publicado` se não.
 */
function lastmodDe(path: string): string | null {
  const slug = path.startsWith('/blog/') ? path.slice('/blog/'.length) : null
  if (slug) {
    const post = posts.find((p) => p.slug === slug)
    return post ? dataVigente(post.meta) : null
  }
  // O índice do blog é tão recente quanto o artigo mais novo que ele lista.
  if (path === '/blog') return posts[0] ? dataVigente(posts[0].meta) : null
  return null
}

function buildSitemap(): string {
  const entries = locales.flatMap((locale) =>
    PATHS.map((path) => {
      const alternates = locales
        .map((l) => `    <xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${routeUrl(l, path)}" />`)
        .join('\n')
      return `  <url>\n    <loc>${routeUrl(locale, path)}</loc>\n${alternates}\n  </url>`
    }),
  )

  // Sem `xhtml:link` nenhum: anunciar alternativa de idioma para uma rota que
  // existe num idioma só é apontar para 404. Mesma decisão que `monolingue`
  // em lib/seo.ts toma no `<head>` das páginas.
  const entriesDoBlog = PATHS_DO_BLOG.map((path) => {
    const lastmod = lastmodDe(path)
    const linha = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
    return `  <url>\n    <loc>${routeUrl(LOCALE_DO_BLOG, path)}</loc>${linha}\n  </url>`
  })

  entries.push(...entriesDoBlog)

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
 * locale. Só existem três formatos de rota em `PATHS` hoje (home, a landing
 * de captação, um case study) — os dois primeiros são casos fixos, o
 * terceiro é o único que varia por dado (`SYSTEM_SLUGS`). Nome e descrição
 * SEMPRE vêm de um campo que já existe no dicionário (mesmo par que
 * `generateMetadata` de cada rota usa) — nunca um texto novo escrito aqui.
 */
function entryFor(d: Dictionary, path: string): { label: string; description: string } {
  if (path === '') return { label: d.hero.name, description: d.meta.description }
  if (path === '/projetos') return { label: d.landing.meta.title, description: d.landing.meta.description }
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

    // OS ARTIGOS ENTRAM SÓ NA SEÇÃO DO PORTUGUÊS, pelo mesmo motivo que não
    // entram em `PATHS`: eles não existem em inglês. Listá-los na seção `en`
    // mandaria o agente de IA para uma URL que o build não gera — e llms.txt
    // existe justamente para ser seguido ao pé da letra.
    if (locale === LOCALE_DO_BLOG && posts.length > 0) {
      for (const post of posts) {
        const url = routeUrl(LOCALE_DO_BLOG, `/blog/${post.slug}`)
        lines.push(`- [${post.meta.titulo}](${url}): ${post.meta.descricao}`)
      }
    }

    lines.push('')
  }

  return lines.join('\n')
}

/**
 * O feed RSS. Três públicos, nesta ordem de importância:
 *
 * 1. O leitor que acompanha por leitor de feed e não volta ao site sozinho.
 * 2. Agregadores, que são fonte de descoberta para os rastreadores.
 * 3. O sinal de "isto publica de verdade" — um domínio com feed e datas
 *    declaradas se comporta como publicação, não como página parada.
 *
 * RSS 2.0 e não Atom por uma razão prática: é o que qualquer leitor aceita sem
 * negociação, e o formato não é onde vale gastar originalidade.
 *
 * A `<description>` leva o resumo do artigo, não o texto inteiro. Feed completo
 * faria o leitor nunca chegar à página — e é na página que estão o índice, o
 * tema e a saída comercial.
 */
function buildFeed(): string {
  const urlDoBlog = routeUrl(LOCALE_DO_BLOG, '/blog')
  const itens = posts.map((post) => {
    const url = routeUrl(LOCALE_DO_BLOG, `/blog/${post.slug}`)
    return [
      '    <item>',
      `      <title>${xml(post.meta.titulo)}</title>`,
      `      <link>${url}</link>`,
      // `isPermaLink="true"` porque o guid É a URL canônica do artigo. Sem o
      // atributo, alguns leitores tratam o guid como opaco e reexibem o item
      // se a URL mudar.
      `      <guid isPermaLink="true">${url}</guid>`,
      `      <pubDate>${new Date(`${post.meta.publicado}T00:00:00Z`).toUTCString()}</pubDate>`,
      `      <description>${xml(post.meta.descricao)}</description>`,
      ...post.meta.tags.map((tag) => `      <category>${xml(tag)}</category>`),
      '    </item>',
    ].join('\n')
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xml(pt.hero.name)} — Blog</title>`,
    `    <link>${urlDoBlog}</link>`,
    `    <description>${xml(blogTextos.meta.descricao)}</description>`,
    `    <language>${HREFLANG[LOCALE_DO_BLOG]}</language>`,
    `    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />`,
    ...itens,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}

writeFileSync(join(OUT, 'sitemap.xml'), buildSitemap(), 'utf8')
writeFileSync(join(OUT, 'robots.txt'), buildRobots(), 'utf8')
writeFileSync(join(OUT, 'llms.txt'), buildLlmsTxt(), 'utf8')
writeFileSync(join(OUT, 'feed.xml'), buildFeed(), 'utf8')

console.log(
  `seo files -> out/sitemap.xml, out/robots.txt, out/llms.txt, out/feed.xml (${posts.length} artigo(s))`,
)
