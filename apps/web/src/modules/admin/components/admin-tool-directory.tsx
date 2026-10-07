'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { AdminTool } from '../lib/admin-tool-directory';
export function AdminToolDirectory({ tools }: { tools: Omit<AdminTool, 'permissions'>[] }) {
  const [query, setQuery] = useState('');
  const filtered = tools.filter((t) =>
    `${t.label} ${t.group}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')),
  );
  return (
    <section className="border-border bg-surface rounded-2xl border p-5">
      <h2 className="font-display text-xl font-semibold">Todas as ferramentas</h2>
      <label className="text-muted mt-3 block text-sm">
        Buscar ferramenta administrativa
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-border mt-2 w-full rounded-lg border p-3"
          placeholder="Agenda, empréstimos, revisões…"
        />
      </label>
      <div className="mt-4 space-y-2">
        {[...new Set(filtered.map((t) => t.group))].map((group) => (
          <details
            key={group}
            open={query ? true : undefined}
            className="border-border rounded-lg border p-3"
          >
            <summary className="cursor-pointer text-sm font-semibold">{group}</summary>
            <nav aria-label={group} className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered
                .filter((t) => t.group === group)
                .map((t) => (
                  <Link
                    key={t.href}
                    href={t.href}
                    className="hover:bg-accent/10 rounded-lg px-3 py-2 text-sm"
                  >
                    {t.label} →
                  </Link>
                ))}
            </nav>
          </details>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-muted mt-4 text-sm">Nenhuma ferramenta disponível para estes filtros.</p>
      )}
    </section>
  );
}
