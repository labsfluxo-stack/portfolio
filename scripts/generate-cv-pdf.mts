import { chromium } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Gera os dois PDFs do currículo (Task 15, spec §9) fotografando a rota real
// `/[locale]/cv` com Playwright, em vez de montar o PDF com uma lib
// dedicada — mesma decisão de `scripts/generate-og.mts`: reaproveita
// `@playwright/test` (já dependência do E2E, zero pacote novo) e garante que
// o PDF usa o HTML/CSS de verdade da página, nunca uma reimplementação que
// sai de sincronia na primeira mudança de dicionário.
//
// Pré-requisito: `out/` já precisa existir com as rotas `/cv` construídas —
// rodar `npm run build` ANTES deste script. Os PDFs saem em `public/cv/`, e
// como este script NÃO está encadeado em `npm run build` (Playwright em todo
// CI seria caro — mesma decisão do `generate:og`), o commit dos dois
// arquivos gerados é o que os leva ao build seguinte.
//
// Reaproveita `scripts/e2e-static-server.mts` (o mesmo servidor estático que
// respeita o basePath do GitHub Pages) em vez de subir outra implementação
// de servidor.

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/portfolio'
const PORT = Number(process.env.CV_PORT ?? 4175)
const ORIGIN = `http://localhost:${PORT}`

const LOCALES = ['pt', 'en'] as const

const OUT_DIR = join(process.cwd(), 'out')
const CV_DIR = join(process.cwd(), 'public', 'cv')

function assertBuilt(): void {
  const sample = join(OUT_DIR, 'pt', 'cv', 'index.html')
  if (!existsSync(sample)) {
    throw new Error(
      `${sample} não existe. Rode \`npm run build\` antes de \`node scripts/generate-cv-pdf.mts\` — ` +
        'este script fotografa a rota /cv já construída em out/, não a gera.',
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
  mkdirSync(CV_DIR, { recursive: true })

  const server = startServer()
  try {
    await waitForServer(`${ORIGIN}${BASE_PATH}/pt/`)

    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()
      for (const locale of LOCALES) {
        const url = `${ORIGIN}${BASE_PATH}/${locale}/cv/`
        await page.goto(url, { waitUntil: 'networkidle' })
        const file = join(CV_DIR, `neto-alves-${locale}.pdf`)
        await page.pdf({ path: file, format: 'A4', printBackground: true })
        const { size } = statSync(file)
        console.log(`cv -> ${file} (${size} bytes)`)
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
