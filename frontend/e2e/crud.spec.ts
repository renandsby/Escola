import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Login before each test
  await page.goto('/login')
  await page.fill('input[type="text"]', 'admin')
  await page.fill('input[type="password"]', 'admin123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
})

test.describe('Schools CRUD', () => {
  test('should list schools', async ({ page }) => {
    // Navigate to schools
    await page.click('text=Escolas')
    await expect(page).toHaveURL(/\/schools/)

    // Check if list is displayed
    const table = page.locator('table, [role="grid"]')
    await expect(table).toBeVisible()
  })

  test('should create a school', async ({ page }) => {
    // Navigate to schools
    await page.click('text=Escolas')

    // Click create button
    await page.click('text=Criar, Adicionar, Nova')

    // Fill form
    await page.fill('input[name="name"]', 'Escola Teste E2E')
    await page.fill('input[name="email"]', 'escolae2e@example.com')

    // Submit
    await page.click('button[type="submit"]')

    // Should see success message or redirect
    await expect(page).toHaveURL(/\/schools/)
  })

  test('should update a school', async ({ page }) => {
    // Navigate to schools
    await page.click('text=Escolas')

    // Click edit button (first school)
    await page.click('text=Editar')

    // Update name
    await page.fill('input[name="name"]', 'Escola Atualizada')

    // Submit
    await page.click('button[type="submit"]')

    // Should see updated data
    await expect(page).toHaveURL(/\/schools/)
  })
})

test.describe('Students CRUD', () => {
  test('should list students', async ({ page }) => {
    // Navigate to students
    await page.click('text=Alunos')
    await expect(page).toHaveURL(/\/students/)

    // Check if list is displayed
    const table = page.locator('table, [role="grid"]')
    await expect(table).toBeVisible()
  })

  test('should search students', async ({ page }) => {
    // Navigate to students
    await page.click('text=Alunos')

    // Type in search
    const searchInput = page.locator('input[placeholder*="buscar, pesquisar, filtro"], input[type="text"]').first()
    if (searchInput) {
      await searchInput.fill('test')
      await page.waitForTimeout(500)

      // Results should be filtered
      const table = page.locator('table, [role="grid"]')
      await expect(table).toBeVisible()
    }
  })

  test('should view student detail', async ({ page }) => {
    // Navigate to students
    await page.click('text=Alunos')

    // Click view button
    const viewButton = page.locator('button, a').filter({ hasText: /visualizar, ver, detalhes/ }).first()
    if (viewButton) {
      await viewButton.click()
      await page.waitForURL(/\/students\/\d+/)
    }
  })
})

test.describe('Grades', () => {
  test('should list grades', async ({ page }) => {
    // Navigate to grades/boletins
    await page.click('text=Boletins')
    await expect(page).toHaveURL(/\/(grades|boletins)/)

    // Check if list is displayed
    const table = page.locator('table, [role="grid"]')
    await expect(table).toBeVisible()
  })

  test('should display grade averages', async ({ page }) => {
    // Navigate to grades
    await page.click('text=Boletins')

    // Look for average column
    const average = page.locator('text=Média, Average, Nota')
    if (average) {
      await expect(average).toBeVisible()
    }
  })
})

test.describe('Attendance', () => {
  test('should list attendance', async ({ page }) => {
    // Navigate to attendance
    await page.click('text=Frequência')
    await expect(page).toHaveURL(/\/attendance/)

    // Check if list is displayed
    const table = page.locator('table, [role="grid"]')
    await expect(table).toBeVisible()
  })
})
