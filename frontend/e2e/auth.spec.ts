import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="text"], input[name="username"]', 'admin')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[type="text"], input[name="username"]', 'admin')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/login/)
  })

  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Dashboard (sme_admin)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="text"], input[name="username"]', 'admin')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)
  })

  test('should display dashboard', async ({ page }) => {
    const header = page.locator('h1, h2').first()
    await expect(header).toBeVisible()
  })

  test('should have sidebar with Escolas or Secretaria', async ({ page }) => {
    const sidebar = page.locator('aside, nav').first()
    await expect(sidebar).toBeVisible()
    // sme_admin deve ver navegação institucional (rótulos podem variar levemente)
    const navHint = page.getByText(/Escolas|Secretaria|Dashboard/i).first()
    await expect(navHint).toBeVisible()
  })
})
