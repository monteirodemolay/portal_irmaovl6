import sharedConfig from './packages/config/eslint/index.js';

export default [
  {
    ignores: ['**/.next/**', '**/dist/**', '**/lib/**', '**/node_modules/**', '**/next-env.d.ts'],
  },
  ...sharedConfig,
];
