import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { locales } from '../../content/types'

const OUT = join(process.cwd(), 'out')

test('a landing de ativações existe em out/ nos dois idiomas', () => {
  for (const locale of locales) {
    const arquivo = join(OUT, locale, 'ativacoes', 'index.html')
    expect(existsSync(arquivo), `rota não gerada: /${locale}/ativacoes`).toBe(true)
  }
})

// Esta rota NÃO inverte polaridade, ao contrário da /projetos: o escuro é o
// padrão do site. O teste existe para que uma cópia distraída do layout da
// /projetos (que carrega o bloco de inversão) seja pega — inverter aqui
// deixaria a página clara com tokens escuros e ninguém veria em teste unitário.
test('a landing de ativações segue escura, como o resto do site', async ({ page }) => {
  await page.goto('/pt/ativacoes/')
  const corDeFundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(corDeFundo).toBe('rgb(8, 9, 12)')

  const esquema = await page.evaluate(
    () => getComputedStyle(document.documentElement).colorScheme,
  )
  expect(esquema).toBe('dark')
})

test('a landing de ativações não leva o cromo de navegação do portfólio', () => {
  const bruto = readFileSync(join(OUT, 'pt', 'ativacoes', 'index.html'), 'utf8')
  expect(bruto).not.toContain('<header')
  expect(bruto).not.toContain('<footer')
})

test('a landing de ativações está no sitemap, nos dois idiomas', () => {
  const sitemap = readFileSync(join(OUT, 'sitemap.xml'), 'utf8')
  for (const locale of locales) {
    expect(sitemap).toContain(`/${locale}/ativacoes/`)
  }
})

// Mesma medição que a /projetos precisou: `BarraCta` é `position: fixed` e não
// ocupa espaço no fluxo, então sem o `pb-20` no PRÓPRIO `<main>` ela cobre o
// último bloco depois de rolar até o fundo. É defeito de celular, e só aparece
// no navegador de verdade.
test('a barra fixa não cobre o último bloco no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/pt/ativacoes/')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

  const sobreposto = await page.evaluate(() => {
    // O SELETOR É ESCOPADO A `div.fixed` DE PROPÓSITO, e é a mesma armadilha
    // que a /projetos já pagou: existem TRÊS links de wa.me na página (capa,
    // chamada final e a barra fixa, os três reusando `urlWhatsapp`). Sem o
    // escopo, `querySelector` devolve o primeiro em ordem de documento — o da
    // capa, que não está dentro de nenhum `div.fixed` — e `?.closest(...)`
    // resulta em `undefined`, fazendo o teste "passar" por não achar nada em
    // vez de medir a sobreposição de verdade.
    const barra = document.querySelector('div.fixed a[href*="wa.me"]')?.closest('div.fixed')
    const ultimo = document.querySelector('main > :last-child')
    if (!barra || !ultimo) return null
    const b = barra.getBoundingClientRect()
    const u = ultimo.getBoundingClientRect()
    return u.bottom > b.top
  })
  expect(sobreposto, 'não achou a barra ou o último bloco — o seletor mudou').not.toBeNull()
  expect(sobreposto, 'a barra cobre o fim do conteúdo').toBe(false)
})

// A partida precisa estar rodando antes de qualquer toque: é o modo atrativo,
// e é o que dá movimento à dobra para quem só está lendo.
test('a dobra joga sozinha e o placar sobe sem ninguém tocar', async ({ page }) => {
  await page.goto('/pt/ativacoes/')
  const placar = page.locator('text=/\\d+ acertos/')
  await expect(placar).toBeVisible()
  await expect(placar).not.toHaveText('0 acertos', { timeout: 8000 })
})
