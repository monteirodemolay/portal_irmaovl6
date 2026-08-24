'use client';

import { useMemo, useState } from 'react';
import type { ArchiveItem, BoardTerm, Event } from '@vl6/domain';
import { BRAZIL_TIME_ZONE } from '@vl6/shared';
import { Badge, Button, Card, CardContent, EmptyState, Input, Select } from '@vl6/ui';
import { normalizeSearchText } from '../../lib/archive-search-match';
import { CreateEventInlineForm } from './create-event-inline-form';

function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: BRAZIL_TIME_ZONE,
  }).format(new Date(date));
}

export interface EventStepProps {
  events: Event[];
  drafts: ArchiveItem[];
  boardTerms: BoardTerm[];
  onEventSelected: (event: Event, existingArchiveItemId: string | null) => void;
  onResumeDraft: (draft: ArchiveItem) => void;
}

/**
 * Passo 1 do wizard — seletor de Evento (busca por título/data + filtro por
 * Gestão), cadastro retroativo inline e retomada de rascunhos já
 * existentes (docs/architecture/11-acervo-vl6.md §11.5).
 */
export function EventStep({
  events,
  drafts,
  boardTerms,
  onEventSelected,
  onResumeDraft,
}: EventStepProps) {
  const [query, setQuery] = useState('');
  // A Gestão mais recente vem primeiro em `boardTerms` (repositório ordena
  // por `periodoInicio desc`) — usada como filtro padrão pra não obrigar o
  // Administrador a escolher toda vez que só quer publicar da gestão atual.
  const [boardTermFilter, setBoardTermFilter] = useState(boardTerms[0]?.id ?? '');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const boardTermNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const term of boardTerms) map.set(term.id, term.nome);
    return map;
  }, [boardTerms]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    return events
      .filter((event) => !boardTermFilter || event.boardTermId === boardTermFilter)
      .filter((event) => {
        if (!normalizedQuery) return true;
        const haystack = normalizeSearchText(
          `${event.titulo} ${event.local} ${formatEventDate(event.dataInicio)}`,
        );
        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime());
  }, [events, query, boardTermFilter]);

  return (
    <div className="flex flex-col gap-6">
      {drafts.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <p className="font-medium">Continuar rascunho</p>
            <ul className="flex flex-col gap-2">
              {drafts.slice(0, 8).map((draft) => (
                <li key={draft.id}>
                  <button
                    type="button"
                    onClick={() => onResumeDraft(draft)}
                    className="border-border hover:bg-surface flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm"
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">{draft.titulo}</span>
                      <span className="text-muted text-xs">
                        Criado em {formatEventDate(draft.createdAt)}
                      </span>
                    </span>
                    <Badge variant="warning">Rascunho</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar por título, local ou data…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="max-w-sm"
          />
          <Select
            value={boardTermFilter}
            onChange={(event) => setBoardTermFilter(event.target.value)}
            className="max-w-48"
          >
            <option value="">Todas as Gestões</option>
            {boardTerms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.nome}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="outline"
            className="ml-auto"
            onClick={() => setShowCreateForm((current) => !current)}
          >
            {showCreateForm ? 'Cancelar cadastro' : 'Cadastrar evento retroativo'}
          </Button>
        </div>

        {showCreateForm && (
          <CreateEventInlineForm
            onCreated={(event) => {
              setShowCreateForm(false);
              onEventSelected(event, null);
            }}
          />
        )}

        {filteredEvents.length === 0 ? (
          <EmptyState
            title="Nenhum evento encontrado"
            description="Ajuste a busca ou cadastre o evento retroativamente."
          />
        ) : (
          <ul className="border-border flex max-h-[420px] flex-col gap-2 overflow-y-auto rounded border p-2">
            {filteredEvents.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onEventSelected(event, null)}
                  className="border-border hover:bg-surface flex w-full items-center justify-between gap-3 rounded border px-4 py-3 text-left"
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{event.titulo}</span>
                    <span className="text-muted text-xs">
                      {formatEventDate(event.dataInicio)} · {event.local}
                    </span>
                  </span>
                  {event.boardTermId && (
                    <Badge variant="accent">
                      {boardTermNameById.get(event.boardTermId) ?? 'Gestão'}
                    </Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
