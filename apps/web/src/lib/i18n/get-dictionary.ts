import type { Locale } from '@vl6/shared';
import { dictionary as ptBR } from './dictionaries/pt-BR';
import { dictionary as en } from './dictionaries/en';
import type { Dictionary } from './dictionaries/pt-BR';

const DICTIONARIES: Record<Locale, Dictionary> = { 'pt-BR': ptBR, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
