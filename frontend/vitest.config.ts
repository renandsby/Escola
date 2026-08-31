import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Testes unitários ficam em src/; e2e/ é do Playwright.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/', 'dist/', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'src/types/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      // Piso de catraca ("ratchet"): nunca abaixa. Sobe conforme os testes crescem.
      // (não conta os próprios arquivos de teste nem os tipos gerados)
      thresholds: {
        lines: 18,
        branches: 42,
        functions: 25,
        statements: 18,
        // Núcleo de lógica: barra alta, já atingida.
        'src/utils/**': { lines: 90, functions: 90, branches: 85, statements: 90 },
        'src/services/errorMessages.ts': { lines: 85, functions: 0, branches: 90, statements: 85 },
        'src/stores/**': { lines: 80, functions: 60, branches: 75, statements: 80 },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
