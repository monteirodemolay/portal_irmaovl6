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
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) / 2)',
        lg: 'var(--radius)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
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
