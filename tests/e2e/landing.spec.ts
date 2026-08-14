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

test('a landing está no sitemap, nos dois idiomas', () => {
  const sitemap = readFileSync(join(OUT, 'sitemap.xml'), 'utf8')
  for (const locale of locales) {
    expect(sitemap).toContain(`/${locale}/projetos/`)
  }
})

test('a barra fixa do celular não cobre o último bloco', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/pt/projetos/')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

  const sobreposto = await page.evaluate(() => {
    // Existem TRÊS links de wa.me na página (Hero, LandingCta e a barra fixa
    // — os três CTAs reusam a mesma mensagem via `urlWhatsapp`). Sem escopar
    // a busca a `div.fixed`, `querySelector` devolve o primeiro em ordem de
    // documento — o do Hero, que não está dentro de nenhum `div.fixed` — e
    // `?.closest(...)` resulta em `undefined`, fazendo o teste "passar" por
    // não achar nada em vez de medir a sobreposição de verdade. Confirmado
    // isolando os três matches num script à parte antes de corrigir aqui.
    const barra = document.querySelector('div.fixed a[href*="wa.me"]')?.closest('div.fixed')
    const ultimo = document.querySelector('main > :last-child')
    if (!barra || !ultimo) return null
    const b = barra.getBoundingClientRect()
    const u = ultimo.getBoundingClientRect()
    return u.bottom > b.top
  })
  expect(sobreposto, 'a barra cobre o fim do conteúdo').toBe(false)
})
