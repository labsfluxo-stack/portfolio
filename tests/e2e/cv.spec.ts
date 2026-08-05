import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { pt } from '../../content/pt'
import { locales } from '../../content/types'

// Portão do currículo em PDF (Task 15, spec §9). Os dois PDFs vivem em
// `public/cv/` e são copiados por `next build` para `out/cv/` como qualquer
// outro asset estático (gerados fora do build por `npm run generate:cv`,
// mesma decisão do OG da Task 14 — Playwright em todo CI seria caro).

const OUT = join(process.cwd(), 'out')

// Mesma armadilha do brief da Task 14, propagada aqui: o payload de
// hidratação do React (`<script>self.__next_f.push(...)</script>`) serializa
// o dicionário inteiro dentro de `<script>`, então um grep ingênuo dá falso
// positivo mesmo que o conteúdo não apareça fora dele. `[\s\S]*?` não
// guloso evita tanto esse falso positivo quanto o oposto (um `.*` guloso
// apagaria o documento inteiro, já que o Next gera o HTML numa linha só).
function semScripts(source: string): string {
  return source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
}

test('as duas rotas de CV existem em out/ (locales x cv)', () => {
  for (const locale of locales) {
    const file = join(OUT, locale, 'cv', 'index.html')
    expect(existsSync(file), `${file} deveria existir apos o build`).toBe(true)
  }
})

for (const locale of locales) {
  test(`/${locale}/cv traz "10+", "Cisco" e "CS50x" fora de <script>`, () => {
    const file = join(OUT, locale, 'cv', 'index.html')
    const clean = semScripts(readFileSync(file, 'utf8'))
    expect(clean).toContain('10+')
    expect(clean).toContain('Cisco')
    expect(clean).toContain('CS50x')
  })
}

for (const locale of locales) {
  test(`public/cv/neto-alves-${locale}.pdf existe e passa de 20 KB`, () => {
    // Lido de `public/`, não de `out/cv/`: os PDFs são commitados ali por
    // `npm run generate:cv` (ver scripts/generate-cv-pdf.mts) e o build
    // normal só os copia — checar a fonte garante que o teste falha se
    // alguém apagar o PDF versionado, mesmo antes de rodar `next build`.
    const file = join(process.cwd(), 'public', 'cv', `neto-alves-${locale}.pdf`)
    expect(existsSync(file), `${file} deveria existir (rode \`npm run generate:cv\`)`).toBe(true)
    const { size } = statSync(file)
    expect(size, `${file} tem ${size} bytes`).toBeGreaterThan(20 * 1024)
  })
}

test('a rota /pt/cv carrega no navegador com o nome no título', async ({ page }) => {
  await page.goto('/pt/cv/')
  await expect(page).toHaveTitle(new RegExp(pt.hero.name))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(pt.hero.name)
})
