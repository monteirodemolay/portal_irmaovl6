import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
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
  plugins: [tailwindcssAnimate],
};

export default config;
