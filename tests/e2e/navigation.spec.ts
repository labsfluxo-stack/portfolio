import { expect, test } from '@playwright/test'

test('a raiz redireciona para /pt/', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/pt\/$/)
})

test('cada idioma marca o lang correto', async ({ page }) => {
  await page.goto('/pt/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await page.goto('/en/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('o seletor de idioma preserva a rota', async ({ page }) => {
  await page.goto('/pt/')
  await page.getByRole('link', { name: 'en' }).click()
  await expect(page).toHaveURL(/\/en\/$/)
})
