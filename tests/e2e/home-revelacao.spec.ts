import { expect, test } from '@playwright/test'

/**
 * A revelação da home saiu do `motion/react` para `animation-timeline: view()`.
 *
 * O modo de falha que isto guarda é o pior possível: se a revelação não
 * completar, o conteúdo fica preso em `opacity: 0` e a página inteira abaixo do
 * hero desaparece — com o texto todo presente no HTML, o que faz o defeito
 * passar por qualquer teste que só leia a fonte.
 */
test('nenhum bloco da home fica preso invisível depois de percorrer a página', async ({ page }) => {
  await page.goto('/pt/')

  // Rola até o fim em passos, para toda faixa de revelação ser atravessada —
  // um salto direto ao rodapé pularia elementos cuja faixa fica no meio.
  const altura = await page.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y <= altura; y += 400) {
    await page.evaluate((alvo) => window.scrollTo(0, alvo), y)
    await page.waitForTimeout(60)
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(400)

  const presos = await page.evaluate(() =>
    [...document.querySelectorAll('.revelar')]
      .filter((no) => Number(getComputedStyle(no).opacity) < 0.99)
      .map((no) => `${no.className} :: ${no.textContent?.slice(0, 40)}`),
  )

  expect(presos, `blocos presos abaixo de opacidade 1:\n${presos.join('\n')}`).toEqual([])

  // E o embrulho não pode ter sumido: é ele que carrega o `grid` de que os
  // cards dependem para altura uniforme.
  expect(await page.locator('.revelar').count(), 'nenhum .revelar na home').toBeGreaterThan(0)
})

/** Zero rolagem horizontal — a checagem que o spec §11 pede. */
test('a home não rola de lado', async ({ page }) => {
  await page.goto('/pt/')
  const sobra = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(sobra, 'a home ganhou overflow horizontal').toBeLessThanOrEqual(0)
})
