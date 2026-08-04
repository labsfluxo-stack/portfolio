import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { pt } from '../../content/pt'
import { locales } from '../../content/types'
import { SYSTEM_SLUGS } from '../../content/systems'

test('as 6 paginas de case study existem em out/ (locales x SYSTEM_SLUGS)', () => {
  for (const locale of locales) {
    for (const slug of SYSTEM_SLUGS) {
      const file = join(process.cwd(), 'out', locale, 'sistemas', slug, 'index.html')
      expect(existsSync(file), `${file} deveria existir apos o build`).toBe(true)
    }
  }
})

test('da home ate um case study pelo card, e de volta pelo link de retorno', async ({ page }) => {
  await page.goto('/pt/')

  // "Ver case study" aparece uma vez por card (3 sistemas); o primeiro é
  // suficiente para exercitar a navegação de ida e volta.
  await page.getByRole('link', { name: pt.systems.readCase }).first().click()
  await expect(page).toHaveURL(/\/pt\/sistemas\//)

  // Exatamente um h1 na página de destino, com o nome de algum sistema.
  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toBeVisible()
  await expect(h1).toHaveText(/OSCapstack CRM|Saturno Labs|Moveis\.pro/)

  await page.getByRole('link', { name: pt.systems.caseLabels.backToHome }).click()
  await expect(page).toHaveURL(/\/pt\/$/)
})
