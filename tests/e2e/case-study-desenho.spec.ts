import { expect, test } from '@playwright/test'

/**
 * A arquitetura se desenha nos case studies.
 *
 * O modo de falha é o mesmo que a landing descobriu da forma cara: com o estado
 * escondido escrito FORA do `@supports`, um navegador sem suporte a scroll
 * timeline renderiza a arte completamente invisível — não pela metade, nada.
 * Aqui isso apagaria o diagrama de arquitetura inteiro.
 *
 * A degradação projetada é a inversa: sem suporte, a arte aparece PRONTA — que
 * é o desenho final de qualquer jeito. O Firefox do Playwright não implementa
 * `animation-timeline`, então ele é o teste dessa degradação, não uma exceção
 * a contornar.
 */
test('depois de percorrer o case study, nada fica com traço aberto ou sólido apagado', async ({
  page,
}) => {
  await page.goto('/pt/sistemas/oscapstack/')

  const altura = await page.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y <= altura; y += 300) {
    await page.evaluate((alvo) => window.scrollTo(0, alvo), y)
    await page.waitForTimeout(50)
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(500)

  const pendentes = await page.evaluate(() => {
    const abertos: string[] = []
    for (const no of document.querySelectorAll('.traca')) {
      const offset = parseFloat(getComputedStyle(no).strokeDashoffset || '0')
      if (Math.abs(offset) > 0.01) abertos.push(`traço aberto em <${no.tagName}>: ${offset}`)
    }
    for (const no of document.querySelectorAll('.preenche')) {
      if (Number(getComputedStyle(no).opacity) < 0.99) {
        abertos.push(`sólido apagado em <${no.tagName}>`)
      }
    }
    return abertos
  })

  expect(pendentes, `o desenho não fechou:\n${pendentes.join('\n')}`).toEqual([])
})

/**
 * E o contrário: as formas têm de EXISTIR. Um teste que só verifica "nada
 * pendente" passaria numa página em que o seletor não casa com nada.
 */
test('o diagrama e a arte de capa declaram o desenho', async ({ page }) => {
  await page.goto('/pt/sistemas/oscapstack/')

  expect(await page.locator('svg.arte-viva').count(), 'nenhum SVG declara a timeline').toBeGreaterThan(
    0,
  )
  expect(await page.locator('.traca').count(), 'nenhuma forma recebeu traçado').toBeGreaterThan(0)
  expect(await page.locator('.preenche').count(), 'nada preenche depois').toBeGreaterThan(0)
})

/** Movimento reduzido: tudo visível de imediato, nada a meio caminho. */
test('com movimento reduzido a arte aparece pronta', async ({ browser }) => {
  const contexto = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await contexto.newPage()
  await page.goto('/pt/sistemas/oscapstack/')
  await page.waitForTimeout(300)

  const escondidos = await page.evaluate(
    () =>
      [...document.querySelectorAll('.preenche')].filter(
        (no) => Number(getComputedStyle(no).opacity) < 0.99,
      ).length,
  )
  expect(escondidos, 'quem pediu menos movimento recebeu arte pela metade').toBe(0)

  await contexto.close()
})
