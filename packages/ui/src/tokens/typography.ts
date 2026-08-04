/** Pilhas de fontes do sistema — docs/architecture/09-design-system.md §9.3. */
export const FONT_STACKS = {
  body: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(', '),
  display: ['"Iowan Old Style"', '"Palatino Linotype"', '"Book Antiqua"', 'Georgia', 'serif'].join(
    ', ',
  ),
  mono: ['ui-monospace', '"SF Mono"', '"Cascadia Code"', '"Roboto Mono"', 'monospace'].join(', '),
} as const;

export const TYPE_SCALE = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem',
  '4xl': '2.25rem',
  '5xl': '3rem',
} as const;
