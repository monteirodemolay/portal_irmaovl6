'use client';

import { Children, useState, type ReactNode } from 'react';
import { normalizeForSearch } from '@vl6/shared';

/** Immediate filtering over the already authorized server-rendered cards. */
export function LocalSearchResults({
  items,
  children,
}: {
  items: { id: string; text: string }[];
  children: ReactNode;
}) {
  const [query, setQuery] = useState('');
  const key = normalizeForSearch(query);
  const cards = Children.toArray(children);
  const matches = items
    .map((item, index) => ({ ...item, card: cards[index] }))
    .filter((item) => normalizeForSearch(item.text).includes(key));
  return (
    <section className="flex flex-col gap-4">
      <label className="text-sm font-medium">
        Pesquisar na Biblioteca
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Título, autor ou categoria…"
          className="border-border bg-surface focus-visible:ring-accent mt-2 block w-full rounded-lg border px-4 py-3 focus-visible:outline-none focus-visible:ring-2"
        />
      </label>
      <p role="status" aria-live="polite" className="text-muted text-sm">
        {matches.length} {matches.length === 1 ? 'obra encontrada' : 'obras encontradas'}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {matches.map((item) => (
          <div className="min-w-0" key={item.id}>
            {item.card}
          </div>
        ))}
      </div>
      {matches.length === 0 && (
        <p className="text-muted rounded-lg border p-4 text-sm">
          Nenhuma obra encontrada. Tente outro título, autor ou categoria.
        </p>
      )}
    </section>
  );
}
