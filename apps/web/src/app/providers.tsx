'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { DictionaryProvider } from '@/lib/i18n/dictionary-context';
import type { Dictionary } from '@/lib/i18n/get-dictionary';

export function Providers({
  children,
  dictionary,
}: {
  children: React.ReactNode;
  dictionary: Dictionary;
}) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <DictionaryProvider dictionary={dictionary}>{children}</DictionaryProvider>
    </QueryClientProvider>
  );
}
