import { expect, test } from '@playwright/test'

/**
 * O TESTE QUE IMPEDE A REGRESSÃO QUE ORIGINOU A SPEC.
 *
 * Em 2026-08-29 as frases "Sequência fechada — o brinde é seu." e "Essa
 * mecânica, com a marca da sua agência" estavam ILEGÍVEIS sobre a ilustração.
 * Contraste é medido, não olhado.
 */
test('todo texto do painel de fim tem contraste >= 4.5:1', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/pt/ativacoes/')
  const canvas = page.locator('canvas[aria-label]')
  await expect(canvas).toBeVisible({ timeout: 30_000 })

  await canvas.click({ position: { x: 40, y: 40 } })
  const painel = page.locator('[data-testid="painel-fim"]')
  await expect(painel).toBeVisible({ timeout: 30_000 })

  const relacoes = await page.evaluate(() => {
    const lum = (c: string) => {
      const [r, g, b] = c.match(/\d+/g)!.slice(0, 3).map(Number).map((v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      }) as [number, number, number]
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    return [...document.querySelectorAll('[data-linha-fim]')].map((el) => {
      const e = getComputedStyle(el as HTMLElement)
      const pai = getComputedStyle((el as HTMLElement).closest('[data-testid="painel-fim"]')!)
      const a = lum(e.color)
      const b = lum(pai.backgroundColor)
      const [claro, escuro] = a > b ? [a, b] : [b, a]
      return { texto: (el.textContent ?? '').slice(0, 40), razao: (claro + 0.05) / (escuro + 0.05) }
    })
  })

  expect(relacoes.length, 'o painel precisa marcar suas linhas com data-linha-fim').toBeGreaterThan(3)
  for (const l of relacoes) {
    expect(l.razao, `"${l.texto}" precisa de 4.5:1`).toBeGreaterThanOrEqual(4.5)
  }
})
