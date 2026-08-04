import type { Config } from 'tailwindcss';
import sharedPreset from '@vl6/config/tailwind/preset';

const config: Config = {
  presets: [sharedPreset as Config],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/modules/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
