import type { MetaPost } from '@/content/posts'

/**
 * Declaração de módulo AMPLIADA, não substituída.
 *
 * `@types/mdx` já declara `*.mdx` com o componente no `default`. Módulos
 * ambientes fazem merge em TypeScript, então este bloco ACRESCENTA o `meta` ao
 * que já existe, em vez de competir com ele.
 *
 * Sem `meta` obrigatório aqui, um artigo novo poderia esquecer os metadados e
 * só quebrar no render — data ausente no sitemap, título ausente no índice.
 * Com ele, o `tsc` recusa o arquivo. O teste em `tests/blog-conteudo.test.ts`
 * cobre o que o tipo não alcança: que a data seja real e que o slug do
 * registro corresponda a um arquivo que existe.
 */
declare module '*.mdx' {
  export const meta: MetaPost
}
