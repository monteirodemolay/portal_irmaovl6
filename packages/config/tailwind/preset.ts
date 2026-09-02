import type { Config } from 'tailwindcss';

/**
 * Shared Tailwind preset — maps utility classes to CSS variables so that
 * every color/radius token is resolved at runtime from `TenantBranding`
 * (see docs/architecture/09-design-system.md). No hex value is ever baked
 * into a component class name.
 */
const preset: Partial<Config> = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'hsl(var(--color-primary) / <alpha-value>)',
          dark: 'hsl(var(--color-primary-dark) / <alpha-value>)',
        },
        accent: 'hsl(var(--color-accent) / <alpha-value>)',
        surface: 'hsl(var(--color-surface) / <alpha-value>)',
        background: 'hsl(var(--color-bg) / <alpha-value>)',
        border: 'hsl(var(--color-border) / <alpha-value>)',
        foreground: 'hsl(var(--color-text) / <alpha-value>)',
        muted: 'hsl(var(--color-text-muted) / <alpha-value>)',
      },
      // Raio único do sistema (docs/architecture/09 §9.5): 16px em cards/
      // modais/inputs grandes, 8px em elementos pequenos (badges, botões
      // compactos) — nenhuma outra chave do Tailwind (`xl`/`2xl`/`3xl`/`md`)
      // fica com o valor fixo default da lib, sempre resolvido daqui.
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) / 2)',
        md: 'var(--radius)',
        lg: 'var(--radius)',
        xl: 'var(--radius)',
        '2xl': 'var(--radius)',
        '3xl': 'var(--radius)',
      },
      // Só duas sombras no sistema (docs/architecture/09 §9.5) — qualquer
      // chave maior do Tailwind (`lg`/`xl`/`2xl`) cai no teto `--shadow-md`
      // em vez da sombra dura/default da lib.
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-md)',
        xl: 'var(--shadow-md)',
        '2xl': 'var(--shadow-md)',
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
    },
  },
};

export default preset;
