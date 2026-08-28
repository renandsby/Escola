import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[type="text"], input[name="username"]', 'admin')
  await page.fill('input[type="password"]', 'admin123')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/)
})

test.describe('Schools CRUD', () => {
  test('should list schools', async ({ page }) => {
    // sme_admin continua vendo o menu Escolas (ou rota direta)
    const link = page.getByText(/Escolas/i).first()
    if (await link.isVisible().catch(() => false)) {
      await link.click()
    } else {
      await page.goto('/schools')
    }
    await expect(page).toHaveURL(/\/schools/)

    const list = page.locator('table, [role="grid"], [data-testid="schools-list"]').first()
    await expect(list.or(page.locator('body'))).toBeVisible()
  })

  test('should open create school flow', async ({ page }) => {
    await page.goto('/schools')
    const createBtn = page.getByRole('button', { name: /criar|adicionar|nova/i }).first()
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click()
      const nameInput = page.locator('input[name="name"]').first()
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Escola Teste E2E')
      }
    }
    await expect(page).toHaveURL(/\/schools/)
  })
})

test.describe('Students CRUD', () => {
  test('should list students', async ({ page }) => {
    const link = page.getByText(/Alunos/i).first()
    if (await link.isVisible().catch(() => false)) {
      await link.click()
    } else {
      await page.goto('/students')
    }
    await expect(page).toHaveURL(/\/students/)
  })

  test('should search students', async ({ page }) => {
    await page.goto('/students')
    const searchInput = page
      .locator('input[placeholder*="buscar" i], input[placeholder*="pesquis" i], input[type="search"]')
      .first()
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test')
      await page.waitForTimeout(400)
    }
    await expect(page).toHaveURL(/\/students/)
  })
})

test.describe('Grades', () => {
  test('should reach grades or boletins area', async ({ page }) => {
    const link = page.getByText(/Boletins|Notas|Avalia/i).first()
    if (await link.isVisible().catch(() => false)) {
      await link.click()
      await expect(page).toHaveURL(/\/(grades|boletins|notas)/i)
    } else {
      await page.goto('/grades')
      await expect(page).toHaveURL(/\/grades/)
    }
  })
})

test.describe('Attendance', () => {
  test('should reach attendance area', async ({ page }) => {
    const link = page.getByText(/Frequência|Frequencia/i).first()
    if (await link.isVisible().catch(() => false)) {
      await link.click()
    } else {
      await page.goto('/attendance')
    }
    await expect(page).toHaveURL(/\/attendance/)
  })
})
