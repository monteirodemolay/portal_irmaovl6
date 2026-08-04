// Shared ESLint flat config — enforces the Clean Architecture dependency
// direction described in docs/architecture/02-estrutura-diretorios.md §2.1.
//
//   presentation (apps/web)  -> application/use-cases (packages/domain)
//   application/use-cases    -> domain entities + repository INTERFACES
//   infra (packages/infra)   -> implements repository interfaces (packages/domain)
//   domain (packages/domain) -> nothing external (no Next.js, no React, no Firebase)
//
// Any package consuming this config extends `base` and appends `boundaries`
// with its own `element-types` rule tailored to its position in the graph.

import boundaries from 'eslint-plugin-boundaries';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export const base = [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
];

/**
 * Forbids `packages/domain` from importing anything under `packages/infra`
 * or `apps/web` — the one rule that actually keeps Clean Architecture honest
 * over time, instead of relying on code review alone.
 */
export const domainBoundaries = [
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'packages/domain/src/**' },
        { type: 'infra', pattern: 'packages/infra/src/**' },
        { type: 'ui', pattern: 'packages/ui/src/**' },
        { type: 'shared', pattern: 'packages/shared/src/**' },
        { type: 'app', pattern: 'apps/*/src/**' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'domain', allow: ['domain', 'shared'] },
            { from: 'infra', allow: ['infra', 'domain', 'shared'] },
            { from: 'ui', allow: ['ui', 'shared'] },
            { from: 'app', allow: ['app', 'domain', 'infra', 'ui', 'shared'] },
          ],
        },
      ],
    },
  },
];

export default [...base, ...domainBoundaries];
