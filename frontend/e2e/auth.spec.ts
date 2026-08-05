import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login')

    // Verify login page loads
    await expect(page).toHaveTitle(/login|auth/i)

    // Fill login form
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', 'admin123')

    // Submit form
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
  })

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill with wrong credentials
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', 'wrongpassword')

    // Submit form
    await page.click('button[type="submit"]')

    // Should stay on login page
    await expect(page).toHaveURL('/login')
  })

  test('should redirect to login if not authenticated', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[type="text"]', 'admin')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should display dashboard', async ({ page }) => {
    // Verify dashboard content
    const header = page.locator('h1, h2').first()
    await expect(header).toBeVisible()
  })

  test('should have sidebar navigation', async ({ page }) => {
    // Check if sidebar exists
    const sidebar = page.locator('aside, nav')
    await expect(sidebar).toBeVisible()
  })
})
