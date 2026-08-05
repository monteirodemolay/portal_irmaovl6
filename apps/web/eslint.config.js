import nextPlugin from '@next/eslint-plugin-next';
import sharedConfig from '@vl6/config/eslint';

export default [
  { ignores: ['.next/**', 'next-env.d.ts'] },
  ...sharedConfig,
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // Capa de notícia vem de URL arbitrária (sem otimização configurada
      // ainda) — next/image exigiria largura/altura fixas que não temos.
      '@next/next/no-img-element': 'off',
    },
  },
];
