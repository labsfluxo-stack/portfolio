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
