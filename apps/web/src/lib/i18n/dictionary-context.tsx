'use client';

import { createContext, useContext } from 'react';
import { DEFAULT_LOCALE } from '@vl6/shared';
import { getDictionary, type Dictionary } from './get-dictionary';

const DictionaryContext = createContext<Dictionary>(getDictionary(DEFAULT_LOCALE));

/** Alimentado pelo layout raiz com o dicionário já resolvido a partir de `TenantSettings.idiomaPadrao` — ver apps/web/src/app/layout.tsx. */
export function DictionaryProvider({
  dictionary,
  children,
}: {
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  return <DictionaryContext.Provider value={dictionary}>{children}</DictionaryContext.Provider>;
}

export function useDictionary(): Dictionary {
  return useContext(DictionaryContext);
}
