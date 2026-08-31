import { test, expect } from '@playwright/test'
import { login, DEMO } from './helpers'

test.describe('Autenticação', () => {
  test('login com credenciais válidas leva ao painel', async ({ page }) => {
    await login(page, DEMO.admin.id, DEMO.admin.pass)
    await expect(page).toHaveURL(/\/$|\/$/)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('credenciais inválidas mantêm na tela de login', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/CPF ou e-mail/i).fill('admin')
    await page.getByLabel(/senha/i).fill('senha-errada')
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText(/não foi possível entrar|inválidos/i)).toBeVisible()
  })

  test('rota protegida redireciona para login quando deslogado', async ({ page }) => {
    await page.goto('/alunos')
    await expect(page).toHaveURL(/\/login/)
  })

  test('tela de login oferece o auto-cadastro de responsável', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /criar conta/i }).click()
    await expect(page).toHaveURL(/\/cadastro-responsavel/)
    await expect(page.getByText(/criar conta de responsável/i)).toBeVisible()
  })
})
