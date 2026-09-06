import createMDX from '@next/mdx'
import type { NextConfig } from 'next'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'

/**
 * MDX EXISTE PARA UM ÚNICO CONSUMIDOR: os artigos do blog, em
 * `content/posts/*.mdx`. Nenhuma rota é escrita em MDX — `pageExtensions`
 * continua sem `mdx` de propósito, para que um arquivo solto dentro de `app/`
 * nunca vire página por acidente.
 *
 * Por que MDX e não conteúdo em TS tipado como `content/systems.ts`: artigo de
 * mil e quinhentas palavras dentro de template literal, com bloco de código
 * escapado à mão, é hostil de escrever e pior de revisar — e revisar é
 * justamente o trabalho do dono neste fluxo. Os metadados não ficam soltos por
 * isso: cada arquivo exporta `meta`, tipado em `content/posts.ts` e validado
 * por teste, então continua havendo UMA fonte por artigo.
 */
const comMdx = createMDX({})

export default comMdx({
  output: 'export',
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
} satisfies NextConfig)
