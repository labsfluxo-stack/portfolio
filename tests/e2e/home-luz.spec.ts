import { expect, test } from '@playwright/test'

/**
 * A camada de luz da home escura. O que se guarda aqui são os dois modos de
 * falha que a fonte não denuncia.
 */

test('a aurora existe e não caiu atrás do fundo da página', async ({ page }) => {
  await page.goto('/pt/')
  const aurora = page.locator('.aurora')
  await expect(aurora).toHaveCount(1)

  // MODO DE FALHA: `z-index: -1` sem contexto de empilhamento próprio na seção
  // manda a aurora para trás do fundo do documento — o elemento existe, o CSS
  // está certo, e nada aparece. É invisível para qualquer teste que só leia a
  // fonte, e é a razão do `isolate` no Contact.
  const caixa = await aurora.boundingBox()
  expect(caixa, 'a aurora não tem caixa — nunca foi pintada').not.toBeNull()
  expect(caixa!.width, 'a aurora tem largura zero').toBeGreaterThan(100)

  const isolamento = await page
    .locator('section#contato')
    .evaluate((no) => getComputedStyle(no).isolation)
  expect(isolamento, 'a seção perdeu o `isolate` e a aurora vai sumir').toBe('isolate')
})

/**
 * O orçamento de movimento perpétuo, medido no NAVEGADOR e não na fonte.
 *
 * O teste unitário conta declarações em `globals.css`; este conta o que
 * realmente está animando na página renderizada, pseudo-elementos inclusive —
 * que é onde a `.borda-viva` da landing vive, e é como uma regra da outra
 * página vazaria para esta sem ninguém notar.
 */
test('só uma coisa se move para sempre na home', async ({ page }) => {
  await page.goto('/pt/')
  const achados = await page.evaluate(() => {
    const donas: string[] = []
    for (const no of document.querySelectorAll('*')) {
      for (const pseudo of [null, ':before', ':after']) {
        if (getComputedStyle(no, pseudo).animationIterationCount === 'infinite') {
          donas.push(`${no.className || no.tagName}${pseudo ?? ''}`)
        }
      }
    }
    return donas
  })

  expect(achados, `animações perpétuas na home: ${achados.join(' | ')}`).toHaveLength(1)
  expect(achados[0], 'a dona do orçamento da home deixou de ser a aurora').toContain('aurora')
})

test('com movimento reduzido a aurora para', async ({ browser }) => {
  const contexto = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await contexto.newPage()
  await page.goto('/pt/')

  const contagem = await page
    .locator('.aurora')
    .evaluate((no) => getComputedStyle(no).animationIterationCount)
  expect(contagem, 'a aurora continua girando para quem pediu menos movimento').toBe('1')

  await contexto.close()
})
