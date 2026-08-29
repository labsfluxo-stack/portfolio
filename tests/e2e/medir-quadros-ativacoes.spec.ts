import { expect, test } from '@playwright/test'

/**
 * PORTÃO DE QUADROS DA DOBRA DE ATIVAÇÕES.
 *
 * Difere de `medir-quadros.spec.ts` (a home) num ponto: aquele MEDE e imprime,
 * este AFIRMA. A spec da dobra temática fixou piso de 45fps mediano sob 4×, e
 * sem afirmação não há portão — só relatório que ninguém lê.
 *
 * O piso é 45 e não 59 de propósito: esta suíte não roda no CI, roda em máquina
 * de gente. Piso apertado reprova por hardware alheio e vira portão desligado.
 *
 *   npx playwright test tests/e2e/medir-quadros-ativacoes.spec.ts --project=chromium
 */
const PISO_FPS = 45

const CONTAR = `
  (duracao) => new Promise((resolve) => {
    const inicio = performance.now()
    const deltas = []
    let anterior = inicio
    const passo = (agora) => {
      deltas.push(agora - anterior)
      anterior = agora
      if (agora - inicio < duracao) requestAnimationFrame(passo)
      else {
        const ordenados = [...deltas].sort((a, b) => a - b)
        resolve({
          quadros: deltas.length,
          fpsMediana: 1000 / (ordenados[ordenados.length >> 1] ?? 16.7),
          piorQuadroMs: ordenados[Math.floor(ordenados.length * 0.95)] ?? 0,
        })
      }
    }
    requestAnimationFrame(passo)
  })
`

for (const estrangulamento of [1, 4]) {
  test(`quadros da dobra de ativações com CPU ${estrangulamento}x`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'o estrangulamento de CPU é do CDP')
    test.setTimeout(120_000)

    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: estrangulamento })

    await page.goto('/pt/ativacoes/')
    const canvas = page.locator('canvas[aria-label]')
    await expect(canvas).toBeVisible({ timeout: 30_000 })

    // Começa a partida: o regime que interessa é o de jogo, não o atrativo.
    await canvas.click({ position: { x: 40, y: 40 } })
    await page.waitForTimeout(1200)

    const medida = (await page.evaluate(`(${CONTAR})(6000)`)) as {
      quadros: number
      fpsMediana: number
      piorQuadroMs: number
    }
    console.log(`\n── CPU ${estrangulamento}× ──`, JSON.stringify(medida, null, 2))

    expect(medida.quadros, 'o laço nem rodou — a aba pode estar oculta').toBeGreaterThan(60)
    if (estrangulamento === 4) {
      expect(medida.fpsMediana, `piso de ${PISO_FPS}fps sob 4× (spec §9)`).toBeGreaterThan(PISO_FPS)
    }
  })
}
