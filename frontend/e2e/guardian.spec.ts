import { test, expect } from '@playwright/test'
import { login, DEMO } from './helpers'

test.describe('Portal do responsável (student_guardian)', () => {
  test('auto-cadastro: a tela pública valida os campos obrigatórios', async ({ page }) => {
    await page.goto('/cadastro-responsavel')
    await page.getByRole('button', { name: /criar conta/i }).click()
    // Zod deve barrar o envio e manter na página
    await expect(page).toHaveURL(/\/cadastro-responsavel/)
    await expect(page.getByText(/nome completo/i).first()).toBeVisible()
  })

  test('portal "Meus filhos" abre e oferece vincular estudante', async ({ page }) => {
    await login(page, DEMO.guardian.id, DEMO.guardian.pass)
    await expect(page.getByRole('heading', { name: /olá|meus filhos/i }).first()).toBeVisible()

    await page.getByRole('button', { name: /vincular estudante/i }).click()
    const modal = page.getByRole('dialog')
    await expect(modal.getByText(/tenho um código/i)).toBeVisible()
    await expect(modal.getByText(/solicitar à escola/i)).toBeVisible()

    // aba "Solicitar à escola" revela os 3 dados de parentesco
    await modal.getByRole('button', { name: /solicitar à escola/i }).click()
    await expect(modal.getByText(/nome completo da mãe/i)).toBeVisible()
  })

  test('código de vínculo inválido mostra erro amigável', async ({ page }) => {
    await login(page, DEMO.guardian.id, DEMO.guardian.pass)
    await page.getByRole('button', { name: /vincular estudante/i }).click()
    const modal = page.getByRole('dialog')
    await modal.getByPlaceholder('000.000.000-00').fill('529.982.247-25')
    await modal.getByPlaceholder('XXXX-XXXX').fill('ZZZZ-9999')
    await modal.getByRole('button', { name: 'Vincular' }).click()
    await expect(modal.getByText(/código inválido|não foi possível/i)).toBeVisible()
  })
})
