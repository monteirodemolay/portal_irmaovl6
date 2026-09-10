import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import containerQueries from '@tailwindcss/container-queries';
import sharedPreset from '@vl6/config/tailwind/preset';

const config: Config = {
  presets: [sharedPreset as Config],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/modules/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  // `tailwindcss-animate` fornece as classes `animate-in`/`slide-in-from-*`
  // que o Drawer (packages/ui) usa pra entrada suave — sem plugin próprio
  // de animação no design system ainda (ver docs/architecture/09).
  // `@tailwindcss/container-queries` fornece `@container`/`@5xl:` — usado
  // pelo perfil público (`public-member-profile-view.tsx`) pra decidir a
  // grade 8/4 pelo espaço do próprio container, não do viewport, já que o
  // mesmo componente também renderiza dentro do Drawer do Diretório e do
  // Dialog de preview, ambos bem mais estreitos que a página cheia.
  plugins: [tailwindcssAnimate, containerQueries],
};

export default config;
