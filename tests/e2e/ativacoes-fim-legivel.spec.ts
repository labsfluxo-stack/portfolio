import { expect, test } from '@playwright/test'

/**
 * O TESTE QUE IMPEDE A REGRESSÃO QUE ORIGINOU A SPEC.
 *
 * Em 2026-08-29 as frases "Sequência fechada — o brinde é seu." e "Essa
 * mecânica, com a marca da sua agência" estavam ILEGÍVEIS sobre a ilustração.
 * Contraste é medido, não olhado.
 *
 * NOME DO TESTE: "toda LINHA DE RESULTADO", não "todo texto do painel" —
 * a legenda do QR (`capa.qr`, dentro do painel desde a tarefa 6) usa
 * `text-faint` (~2,29:1, abaixo do piso) e fica de propósito FORA de
 * `[data-linha-fim]`: é um defeito pré-existente, sem relação com a
 * regressão que este teste guarda, e fora do escopo desta tarefa. O nome
 * antigo ("todo texto do painel") deixava de ser literalmente verdade com
 * essa exceção viva ali dentro — achado da revisão (fix round 1).
 */
test('toda linha de resultado do painel de fim tem contraste >= 4.5:1', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/pt/ativacoes/')
  const canvas = page.locator('canvas[aria-label]')
  await expect(canvas).toBeVisible({ timeout: 30_000 })

  await canvas.click({ position: { x: 40, y: 40 } })
  const painel = page.locator('[data-testid="painel-fim"]')
  await expect(painel).toBeVisible({ timeout: 30_000 })

  const linhas = await page.evaluate(() => {
    const lum = (c: string) => {
      const [r, g, b] = c.match(/\d+/g)!.slice(0, 3).map(Number).map((v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      }) as [number, number, number]
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    return [...document.querySelectorAll('[data-linha-fim]')].map((elBase) => {
      const el = elBase as HTMLElement
      const e = getComputedStyle(el)
      const pai = getComputedStyle(el.closest('[data-testid="painel-fim"]')!)
      const a = lum(e.color)
      const b = lum(pai.backgroundColor)
      const [claro, escuro] = a > b ? [a, b] : [b, a]

      // GUARDA CONTRA A REINCIDÊNCIA (fix round 1): o defeito real que a
      // revisão achou foi um `<p data-linha-fim>` SEM classe de cor
      // própria, envolvendo dois `<span>` filhos com cores diferentes —
      // `getComputedStyle(p).color` devolvia a cor HERDADA do painel/body,
      // nunca a de nenhum pixel visível, e o portão aprovava às cegas.
      // Duas checagens simples, cada uma sozinha já teria acusado aquele
      // caso:
      //
      // 1. TEXTO PRÓPRIO: o elemento marcado precisa ter um nó de texto
      //    DIRETO seu (não só filhos-elemento carregando o texto de
      //    verdade) — um `<p>` que só embrulha `<span>`s não tem texto
      //    próprio nenhum.
      const temTextoProprio = [...el.childNodes].some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim().length > 0,
      )
      // 2. COR PRÓPRIA: a classe do elemento precisa citar um dos tokens de
      //    cor de texto do design system (`--color-*` em `globals.css`) —
      //    sem isso, `color` só pode estar vindo de herança.
      const temCorPropria =
        /\btext-(bg|surface-2|surface|border|text|muted|faint|ok|warn|off|data|paper|ink-2|ink|accent|rule|alerta)\b/.test(
          el.className,
        )

      return {
        texto: (el.textContent ?? '').slice(0, 40),
        razao: (claro + 0.05) / (escuro + 0.05),
        temTextoProprio,
        temCorPropria,
      }
    })
  })

  expect(linhas.length, 'o painel precisa marcar suas linhas com data-linha-fim').toBeGreaterThan(3)
  for (const l of linhas) {
    expect(
      l.temTextoProprio,
      `"${l.texto}" está marcado num elemento sem texto próprio — provavelmente um wrapper, e a cor medida pode não ser a de nenhum pixel visível`,
    ).toBe(true)
    expect(
      l.temCorPropria,
      `"${l.texto}" não declara a própria cor — o portão estaria medindo cor herdada do painel/body, não a cor renderizada`,
    ).toBe(true)
    expect(l.razao, `"${l.texto}" precisa de 4.5:1`).toBeGreaterThanOrEqual(4.5)
  }
})
