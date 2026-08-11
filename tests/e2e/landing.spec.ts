import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { locales } from '../../content/types'

const OUT = join(process.cwd(), 'out')

test('a landing existe em out/ nos dois idiomas', () => {
  for (const locale of locales) {
    const arquivo = join(OUT, locale, 'projetos', 'index.html')
    expect(existsSync(arquivo), `rota não gerada: /${locale}/projetos`).toBe(true)
  }
})

// O portfólio inteiro é escuro; esta rota é a exceção. Sem sobrescrever
// `color-scheme`, o navegador desenha barra de rolagem e controles nativos em
// tema escuro sobre uma página clara — defeito que só aparece no navegador de
// verdade, nunca em teste de unidade.
test('a landing não herda o tema escuro do portfólio', async ({ page }) => {
  await page.goto('/pt/projetos/')
  const corDeFundo = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  )
  expect(corDeFundo).toBe('rgb(245, 243, 239)')

  const esquema = await page.evaluate(
    () => getComputedStyle(document.documentElement).colorScheme,
  )
  expect(esquema).toBe('light')
})

test('a landing não leva o cromo de navegação do portfólio', () => {
  const bruto = readFileSync(join(OUT, 'pt', 'projetos', 'index.html'), 'utf8')
  expect(bruto).not.toContain('<header')
  expect(bruto).not.toContain('<footer')
})
