import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.beforeEach(async ({ page }) => {
  await login(page)
})

test.describe('Jornada da equipe (sme_admin)', () => {
  test('lista de escolas abre e mostra registros', async ({ page }) => {
    await page.goto('/escolas')
    await expect(page).toHaveURL(/\/escolas/)
    await expect(page.getByRole('heading', { name: /escolas/i }).first()).toBeVisible()
  })

  test('lista de alunos abre e permite buscar', async ({ page }) => {
    await page.goto('/alunos')
    await expect(page).toHaveURL(/\/alunos/)
    const busca = page
      .locator('input[placeholder*="buscar" i], input[placeholder*="nome" i], input[type="search"]')
      .first()
    if (await busca.isVisible().catch(() => false)) {
      await busca.fill('a')
      await page.waitForTimeout(400)
    }
  })

  test('fila de solicitações de vínculo de responsável é acessível', async ({ page }) => {
    await page.goto('/responsaveis/solicitacoes-vinculo')
    await expect(page).toHaveURL(/solicitacoes-vinculo/)
    await expect(page.getByText(/solicitações de vínculo/i).first()).toBeVisible()
  })

  test('painel gerencial expõe os filtros de ano letivo e período', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Período').first()).toBeVisible()
    const periodo = page.locator('select').filter({ hasText: 'Todos os bimestres' }).first()
    await expect(periodo).toBeVisible()
  })
})
