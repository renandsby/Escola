import { expect, type Page } from '@playwright/test'

/**
 * Login pela tela real (`/login`, campo "CPF ou e-mail" → name `identifier`).
 * Usa as contas da carga de demonstração (`seed_dashboard_demo`).
 */
export async function login(
  page: Page,
  identifier = 'admin',
  password = 'admin123'
) {
  await page.goto('/login')
  await page.getByLabel(/CPF ou e-mail/i).fill(identifier)
  await page.getByLabel(/senha/i).fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

export const DEMO = {
  admin: { id: 'admin', pass: 'admin123' },
  guardian: { id: 'responsavel', pass: 'resp123' },
}
