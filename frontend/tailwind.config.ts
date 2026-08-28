import type { Config } from 'tailwindcss'

/**
 * Design System "Rede" — tokens.
 * `theme.extend` (não substitui a escala padrão do Tailwind, para não quebrar
 * telas ainda não refatoradas). As regras de uso valem em code review:
 *   - proibido hex/rgb literal em src/components/** e src/features/**
 *   - `ok|warn|danger|qual` somente para estado (badge, validação, pendência)
 *   - fundo de página = `bg-surface-canvas`; painel = `bg-white border border-line rounded-lg`
 *   - sombra só em sobreposição real (`shadow-overlay` / `shadow-sticky`)
 *   - raio: `rounded` controles, `rounded-lg` painéis, `rounded-pill` badges
 *   - tipografia: use os passos nomeados (`text-page`, `text-section`, `text-label`,
 *     `text-base`, `text-help`, `text-micro`)
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Azul institucional — ação, navegação, seleção
        brand: {
          50: 'oklch(0.96 0.015 252)',
          100: 'oklch(0.89 0.045 252)',
          200: 'oklch(0.82 0.07 252)',
          400: 'oklch(0.68 0.12 252)',
          600: 'oklch(0.45 0.12 252)',
          700: 'oklch(0.36 0.11 254)',
        },
        ink: {
          900: 'oklch(0.24 0.03 258)',
          800: 'oklch(0.33 0.03 258)',
          700: 'oklch(0.24 0.015 255)',
          500: 'oklch(0.45 0.02 255)',
          400: 'oklch(0.55 0.02 255)',
        },
        surface: {
          DEFAULT: '#ffffff',
          canvas: 'oklch(0.968 0.004 250)',
          subtle: 'oklch(0.972 0.004 255)',
          hover: 'oklch(0.978 0.008 252)',
        },
        line: {
          DEFAULT: 'oklch(0.90 0.008 255)',
          strong: 'oklch(0.82 0.02 255)',
          soft: 'oklch(0.945 0.006 255)',
        },
        // Semânticas — SOMENTE estado. Nunca decorativas.
        ok: {
          fg: 'oklch(0.40 0.10 158)',
          base: 'oklch(0.52 0.11 158)',
          bg: 'oklch(0.95 0.03 158)',
          border: 'oklch(0.88 0.04 158)',
        },
        warn: {
          fg: 'oklch(0.45 0.11 62)',
          base: 'oklch(0.62 0.13 72)',
          bg: 'oklch(0.97 0.04 72)',
          border: 'oklch(0.88 0.05 72)',
        },
        danger: {
          fg: 'oklch(0.45 0.15 27)',
          base: 'oklch(0.52 0.16 27)',
          bg: 'oklch(0.96 0.03 27)',
          border: 'oklch(0.85 0.06 27)',
        },
        // Violeta = eixo QUALITATIVO (parecer descritivo, Educação Infantil, AEE)
        qual: {
          fg: 'oklch(0.42 0.09 300)',
          base: 'oklch(0.52 0.09 300)',
          bg: 'oklch(0.96 0.025 300)',
          border: 'oklch(0.88 0.04 300)',
        },
      },
      fontFamily: {
        sans: ['"Public Sans"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // escala do DS — os passos fora da lista (xs, xl, 2xl, 3xl) permanecem do Tailwind
        page: ['2rem', { lineHeight: '1.15', letterSpacing: '-0.015em', fontWeight: '650' }],
        section: ['1.25rem', { lineHeight: '1.3', fontWeight: '650' }],
        lg: ['1.0625rem', { lineHeight: '1.5' }],
        base: ['0.9375rem', { lineHeight: '1.55' }],
        label: ['0.84375rem', { lineHeight: '1.4', fontWeight: '600' }],
        sm: ['0.8125rem', { lineHeight: '1.5' }],
        help: ['0.78125rem', { lineHeight: '1.5' }],
        micro: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.12em' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '10px',
        pill: '999px',
      },
      boxShadow: {
        overlay: '0 8px 24px -8px oklch(0.24 0.03 258 / 0.18)',
        sticky: '0 -6px 18px -12px oklch(0.24 0.03 258 / 0.30)',
      },
      height: {
        control: '44px',
        'control-sm': '36px',
        row: '44px',
      },
      minHeight: {
        control: '44px',
      },
      maxWidth: {
        content: '1180px',
      },
    },
  },
  plugins: [],
} satisfies Config
