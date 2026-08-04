import { chromium } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Gera as imagens Open Graph (Task 14, spec §7.2) por SCREENSHOT da rota
// real `/[locale]/og/[slug]`, em vez de compor com `satori` — evita
// dependência nova (reaproveita `@playwright/test`, já usado pelo E2E) e
// garante que o card usa as fontes e o CSS de verdade do site, em vez de
// uma reimplementação que sai de sincronia na primeira mudança de paleta.
//
// Pré-requisito: `out/` já precisa existir com as rotas `/og/*` construídas
// — ou seja, rodar `npm run build` ANTES deste script. As imagens saem em
// `public/og/`, para o build FINAL (rodado depois deste script) copiá-las
// para `out/og/` e a metadata (lib/seo.ts) apontar para arquivos que já
// existem de verdade.
//
// Reaproveita `scripts/e2e-static-server.mts` (o mesmo servidor estático que
// respeita o basePath do GitHub Pages, usado pelo Playwright do E2E) em vez
// de subir outra implementação de servidor — ver o comentário lá para o
// porquê de `serve out` não servir.

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'
const PORT = Number(process.env.OG_PORT ?? 4174)
const ORIGIN = `http://localhost:${PORT}`

const LOCALES = ['pt', 'en'] as const
const SLUGS = ['home', 'oscapstack', 'saturno-labs', 'moveis-pro'] as const

const OUT_DIR = join(process.cwd(), 'out')
const OG_DIR = join(process.cwd(), 'public', 'og')

function assertBuilt(): void {
  const sample = join(OUT_DIR, 'pt', 'og', 'home', 'index.html')
  if (!existsSync(sample)) {
    throw new Error(
      `${sample} não existe. Rode \`npm run build\` antes de \`node scripts/generate-og.mts\` — ` +
        'este script fotografa rotas já construídas em out/, não as gera.',
    )
  }
}

function startServer(): ChildProcess {
  return spawn(process.execPath, ['--experimental-strip-types', 'scripts/e2e-static-server.mts'], {
    env: { ...process.env, PORT: String(PORT), NEXT_PUBLIC_BASE_PATH: BASE_PATH },
    stdio: 'inherit',
  })
}

async function waitForServer(url: string, timeoutMs = 15_000): Promise<void> {
  const start = Date.now()
  for (;;) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // servidor ainda não subiu — tenta de novo até o timeout
    }
    if (Date.now() - start > timeoutMs) throw new Error(`servidor não respondeu em ${url}`)
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
}

async function main(): Promise<void> {
  assertBuilt()
  mkdirSync(OG_DIR, { recursive: true })

  const server = startServer()
  try {
    await waitForServer(`${ORIGIN}${BASE_PATH}/pt/`)

    const browser = await chromium.launch()
    try {
      const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
      for (const locale of LOCALES) {
        for (const slug of SLUGS) {
          const url = `${ORIGIN}${BASE_PATH}/${locale}/og/${slug}/`
          await page.goto(url, { waitUntil: 'networkidle' })
          const file = join(OG_DIR, `${locale}-${slug}.png`)
          await page.screenshot({ path: file })
          const { size } = statSync(file)
          console.log(`og -> ${file} (${size} bytes)`)
        }
      }
    } finally {
      await browser.close()
    }
  } finally {
    server.kill()
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exitCode = 1
})
