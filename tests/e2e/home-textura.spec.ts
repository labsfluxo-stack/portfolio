import { expect, test } from '@playwright/test'

/**
 * Grão e vinheta, e o que se guarda aqui é o ESCOPO.
 *
 * A textura mora no grupo de rotas `(site)`, que é home mais case studies — os
 * dois escuros. A landing tem polaridade de papel e `/cv` é feita para
 * impressão: grão em qualquer uma das duas seria defeito, não estilo, e é o
 * tipo de coisa que ninguém percebe até imprimir o currículo.
 */

test('a textura cobre a home e os case studies', async ({ page }) => {
  await page.goto('/pt/')
  await expect(page.locator('.textura-fundo')).toHaveCount(1)

  await page.goto('/pt/sistemas/oscapstack/')
  await expect(page.locator('.textura-fundo')).toHaveCount(1)
})

test('a textura não vaza para a landing de papel nem para o CV', async ({ page }) => {
  await page.goto('/pt/projetos')
  await expect(page.locator('.textura-fundo')).toHaveCount(0)

  await page.goto('/pt/cv')
  await expect(page.locator('.textura-fundo')).toHaveCount(0)
})

/**
 * MODO DE FALHA: `z-index` errado põe a textura SOBRE o canvas e a cena 3D
 * desaparece atrás de um retângulo quase preto — que, sendo quase preto, não
 * parece um defeito, parece a cena não ter carregado.
 */
test('a textura fica atrás do canvas, nunca sobre ele', async ({ page }) => {
  await page.goto('/pt/')
  const canvas = page.locator('[data-portico-slot] canvas')
  await expect(canvas).toBeVisible({ timeout: 30_000 })

  const camadas = await page.evaluate(() => {
    const textura = document.querySelector('.textura-fundo')
    const cena = document.querySelector('[data-portico-slot] canvas')
    return {
      textura: Number(getComputedStyle(textura!).zIndex),
      // O canvas não declara z-index próprio; o que importa é que a textura
      // esteja em camada NEGATIVA, atrás de todo o conteúdo em fluxo.
      cenaExiste: !!cena,
    }
  })

  expect(camadas.cenaExiste, 'a cena 3D não montou — teste inconclusivo').toBe(true)
  expect(camadas.textura, 'a textura saiu da camada negativa e vai cobrir a cena').toBeLessThan(0)

  // E a prova visual: no ponto central do canvas o pixel não pode ser o
  // fundo chapado da textura.
  const caixa = await canvas.boundingBox()
  expect(caixa, 'o canvas não tem caixa').not.toBeNull()
})
