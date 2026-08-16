import { expect, test } from '@playwright/test'

/**
 * MEDIDOR DE QUADROS DA CENA 3D — a bancada do portão de desempenho.
 *
 * Não é um teste de regressão e por isso não afirma nada sobre a máquina de
 * quem roda: ele MEDE e imprime. O número que interessa é comparativo (antes e
 * depois de uma mudança, no mesmo computador), porque taxa de quadros absoluta
 * depende de GPU, driver e do que mais estiver aberto.
 *
 * Roda só em chromium: o estrangulamento de CPU vem do CDP, que é protocolo do
 * Chrome. É a mesma alavanca que o painel Performance do DevTools usa.
 *
 *   npx playwright test tests/e2e/medir-quadros.spec.ts --project=chromium
 */

/** Conta quadros por `duracao` ms rolando a página, e devolve a taxa média. */
const CONTAR = `
  (duracao) => new Promise((resolve) => {
    const inicio = performance.now()
    const deltas = []
    let anterior = inicio
    let alvo = 0
    const passo = (agora) => {
      deltas.push(agora - anterior)
      anterior = agora
      // Rola devagar o tempo todo: o engasgo relatado é DURANTE a rolagem, e
      // medir a cena parada esconderia justamente o caso que interessa.
      alvo += 6
      window.scrollTo(0, alvo % Math.max(1, document.body.scrollHeight - window.innerHeight))
      if (agora - inicio < duracao) requestAnimationFrame(passo)
      else {
        const ordenados = [...deltas].sort((a, b) => a - b)
        const mediana = ordenados[ordenados.length >> 1] ?? 0
        const pior = ordenados[Math.floor(ordenados.length * 0.95)] ?? 0
        resolve({
          quadros: deltas.length,
          fpsMedio: 1000 / (deltas.reduce((s, d) => s + d, 0) / deltas.length),
          fpsMediana: 1000 / mediana,
          piorQuadroMs: pior,
        })
      }
    }
    requestAnimationFrame(passo)
  })
`

for (const estrangulamento of [1, 4]) {
  test(`taxa de quadros da home com CPU ${estrangulamento}x`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'o estrangulamento de CPU é do CDP')
    test.setTimeout(120_000)

    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: estrangulamento })

    await page.goto('/pt/')
    // A cena só monta depois de `load` mais ociosidade. Esperar o canvas é
    // esperar a decisão do PorticoSlot, não um tempo arbitrário.
    const canvas = page.locator('[data-portico-slot] canvas')
    await expect(canvas).toBeVisible({ timeout: 30_000 })

    // Deixa a cena passar do aquecimento antes de medir: os primeiros quadros
    // são compilação de shader e envio de textura, e contá-los mediria a
    // partida, não o regime.
    await page.waitForTimeout(2500)

    // A LARGURA DO CANVAS É A ESCADA VISÍVEL. `setDpr` reescreve o buffer de
    // desenho, então a resolução em pixels é a leitura direta de em que degrau
    // a cena está — sem instrumentar o componente por dentro.
    const largura = () =>
      page.evaluate(
        () =>
          (document.querySelector('[data-portico-slot] canvas') as HTMLCanvasElement | null)?.width ??
          0,
      )

    const antes = await largura()
    const medida = await page.evaluate(`(${CONTAR})(8000)`)
    const depois = await largura()

    console.log(
      `\n── CPU ${estrangulamento}× ──`,
      JSON.stringify(
        { ...(medida as object), larguraAntes: antes, larguraDepois: depois },
        null,
        2,
      ),
    )

    expect(depois, 'a cena travou o canvas em zero — não é medição, é defeito').toBeGreaterThan(0)
  })
}
