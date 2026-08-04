import { expect, test } from '@playwright/test'

// A barra do <header> é `position: sticky` no topo — clicar num link de
// âncora do menu não pode deixar o topo da seção alvo embaixo dela. Cada
// seção precisa de `scroll-margin-top` suficiente para que, depois do
// salto nativo do navegador, o rótulo da seção fique visível abaixo da
// barra, nunca coberto por ela (medido: header ~63.5px de altura).
const LINKS = [
  { label: 'Sobre', id: 'sobre' },
  { label: 'Sistemas', id: 'sistemas' },
  { label: 'Stack', id: 'stack' },
  { label: 'Terminal', id: 'terminal' },
  { label: 'Contato', id: 'contato' },
]

test('cada link do menu rola a secao para abaixo da barra fixa, nunca para debaixo dela', async ({ page }) => {
  await page.goto('/pt/')
  const headerHeight = await page.locator('header').evaluate((el) => el.getBoundingClientRect().height)

  for (const { label, id } of LINKS) {
    // Sobe ao topo entre um link e outro para garantir que cada clique
    // produz um salto de verdade, não um "já estava lá".
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.locator('header nav').getByRole('link', { name: label, exact: true }).click()
    const top = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top)
    console.log(`#${id}: top=${top.toFixed(1)}px (header=${headerHeight.toFixed(1)}px)`)
    expect(top, `#${id} deve ficar abaixo da barra fixa (${headerHeight.toFixed(1)}px)`).toBeGreaterThan(
      headerHeight,
    )
  }
})
