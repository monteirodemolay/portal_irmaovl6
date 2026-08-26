'use client';

import { useState } from 'react';
import { Input } from '@vl6/ui';
import type { MemberPickerOption } from '../../actions/publish-hub-actions';

/**
 * Seletor de pessoas por nome (item 1 do escopo da Fase A "Pessoas &
 * Descoberta") — marcação manual pelo administrador, nunca reconhecimento
 * facial automático (docs/architecture/11-acervo-vl6.md Etapa 4). Filtra a
 * lista de Irmãos já carregada (`loadMemberPickerOptionsAction`) no client
 * enquanto o admin digita, mesmo espírito simples de `NodeSelect`
 * (`archive-relation-form.tsx`), mas com múltipla seleção via chips.
 */
export function PeoplePicker({
  selectedIds,
  options,
  onChange,
}: {
  selectedIds: string[];
  options: MemberPickerOption[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const nameById = new Map(options.map((option) => [option.id, option.nomeCompleto]));
  const suggestions =
    query.trim().length === 0
      ? []
      : options
          .filter(
            (option) =>
              !selectedIds.includes(option.id) &&
              option.nomeCompleto.toLowerCase().includes(query.trim().toLowerCase()),
          )
          .slice(0, 8);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Marcar pessoa pelo nome…"
        />
        {suggestions.length > 0 && (
          <ul className="border-border bg-surface absolute z-10 mt-1 w-full rounded border shadow-md">
            {suggestions.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="hover:bg-accent/10 block w-full px-3 py-1.5 text-left text-sm"
                  onClick={() => {
                    onChange([...selectedIds, option.id]);
                    setQuery('');
                  }}
                >
                  {option.nomeCompleto}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((id) => (
            <span
              key={id}
              className="bg-accent/15 text-primary-dark inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            >
              {nameById.get(id) ?? 'Irmão'}
              <button
                type="button"
                aria-label="Remover"
                onClick={() => onChange(selectedIds.filter((selectedId) => selectedId !== id))}
                className="hover:text-red-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
