import type { Metadata } from 'next'
import { locales, type Locale } from '@/content/types'

// Mesma convenção de `next.config.ts`, `PhotoFrame.tsx` e `Header.tsx`:
// variável de ambiente com default, para trocar de `basePath` (ou sair do
// GitHub Pages para domínio próprio, spec §5.5) ser uma variável, nunca uma
// refatoração. `NEXT_PUBLIC_SITE_URL` é só a origem (esquema + host); o
// `basePath` continua vindo de `NEXT_PUBLIC_BASE_PATH`.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://labsfluxo-stack.github.io'

/** Origem pública completa, já com o `basePath` — todo link absoluto (URL
 * canônica, hreflang, imagem OG) se constrói a partir daqui. */
export const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}`

/**
 * Único mapeamento `Locale -> hreflang` (BCP 47) do projeto. Alimenta tanto
 * `<html lang>` (app/[locale]/layout.tsx) quanto as chaves de
 * `alternates.languages` abaixo, que o Next expande em
 * `<link rel="alternate" hreflang="...">` — nunca duas fontes de verdade
 * para o mesmo código de idioma.
 */
export const HREFLANG: Record<Locale, string> = { pt: 'pt-BR', en: 'en' }

/**
 * URL absoluta de uma rota pública, com barra final (`trailingSlash: true`
 * em next.config.ts — sem ela o export estático nunca gerou o arquivo, e o
 * link cai em 404 real). `path` é o trecho depois do locale, sem barra
 * inicial nem final: `''` para a home, `'/sistemas/oscapstack'` para um
 * case study.
 */
export function routeUrl(locale: Locale, path: string): string {
  return `${SITE_URL}/${locale}${path}/`
}

export type BuildMetadataOptions = {
  title: string
  description: string
  /** Trecho da rota sem o prefixo de locale, ver `routeUrl`. */
  path: string
  /** Caminho da imagem OG relativo à raiz do site (depois do basePath),
   * ex.: `/og/pt-home.png` — gerada por `scripts/generate-og.mts` em
   * `public/og/`. */
  ogImage: string
  /** Texto alternativo da imagem OG. Sem isto, cai no próprio `title` —
   * nunca um texto genérico inventado aqui dentro. */
  imageAlt?: string
}

/**
 * `Metadata` do Next com Open Graph, Twitter Card, `alternates.languages`
 * recíproco entre os dois idiomas e `metadataBase`. É o portão de GEO
 * (Task 14, spec §7): sem isto, os crawlers que não executam JavaScript —
 * GPTBot, ClaudeBot, PerplexityBot, e os de preview de link do LinkedIn e
 * do WhatsApp — não têm o que ler além do HTML da página.
 */
export function buildMetadata(locale: Locale, options: BuildMetadataOptions): Metadata {
  const { title, description, path, ogImage, imageAlt } = options
  const url = routeUrl(locale, path)
  const imageUrl = `${SITE_URL}${ogImage}`

  const languages: Record<string, string> = { 'x-default': routeUrl('pt', path) }
  for (const l of locales) languages[HREFLANG[l]] = routeUrl(l, path)

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      locale: HREFLANG[locale],
      images: [{ url: imageUrl, width: 1200, height: 630, alt: imageAlt ?? title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}
