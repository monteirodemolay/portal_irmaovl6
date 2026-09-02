'use client';

import { useMemo, useState } from 'react';
import type { ArchiveItem, ArchiveMediaCounts, BoardTerm, Event } from '@vl6/domain';
import { BRAZIL_TIME_ZONE, EVENT_KIND_LABELS } from '@vl6/shared';
import { Badge, Button, EmptyState, Input, Select } from '@vl6/ui';
import { normalizeSearchText } from '../../lib/archive-search-match';
import { CreateEventInlineForm } from './create-event-inline-form';
import { StepTitle } from './wizard-chrome';

function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: BRAZIL_TIME_ZONE,
  }).format(new Date(date));
}

/**
 * Dia e mês formatados separadamente, cada um com seu próprio
 * `Intl.DateTimeFormat` — juntar os dois numa formatação só ("03 de set.")
 * e tentar separar por espaço quebrava em pt-BR: o conector "de" vem no
 * meio ("03 de set."), então `split(' ')[1]` pegava "de" em vez do mês.
 */
function calendarBadgeParts(date: Date): [string, string] {
  const value = new Date(date);
  const day = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    timeZone: BRAZIL_TIME_ZONE,
  }).format(value);
  const month = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    timeZone: BRAZIL_TIME_ZONE,
  })
    .format(value)
    .replace('.', '')
    .toUpperCase();
  return [day, month];
}

const EMPTY_COUNTS: ArchiveMediaCounts = { foto: 0, video: 0, audio: 0, documento: 0 };

export interface EventStepProps {
  events: Event[];
  drafts: ArchiveItem[];
  boardTerms: BoardTerm[];
  mediaCountsByEventId: Record<string, ArchiveMediaCounts>;
  onEventSelected: (event: Event, existingArchiveItemId: string | null) => void;
  onResumeDraft: (draft: ArchiveItem) => void;
}

/**
 * Passo 1 do wizard — seletor de Evento (busca por título/data + filtro por
 * Gestão), cadastro retroativo inline e retomada de rascunhos já
 * existentes (docs/architecture/11-acervo-vl6.md §11.5). Grade de cartões
 * (não lista) — cada cartão mostra o que já foi enviado pra aquele Evento
 * (`mediaCountsByEventId`, `GetArchiveMediaCountsByEventUseCase`), pra
 * ficar claro de longe quais Eventos ainda estão vazios.
 */
export function EventStep({
  events,
  drafts,
  boardTerms,
  mediaCountsByEventId,
  onEventSelected,
  onResumeDraft,
}: EventStepProps) {
  const [query, setQuery] = useState('');
  // Sem filtro de Gestão por padrão ("Todas as Gestões") — `boardTermId` só
  // é preenchido no Evento se já existia uma Gestão cadastrada cobrindo
  // aquela data no momento da criação (`CreateEventUseCase`); um Evento
  // criado antes da Gestão existir no sistema fica com `boardTermId: null`
  // e nunca é recalculado depois. Filtrar pela Gestão mais recente por
  // padrão escondia justamente esses Eventos sem nenhum aviso — o
  // Administrador via "Nenhum evento encontrado" mesmo já tendo cadastrado
  // os Eventos.
  const [boardTermFilter, setBoardTermFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const boardTermNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const term of boardTerms) map.set(term.id, term.nome);
    return map;
  }, [boardTerms]);

  // `event.boardTermId` só existe quando a Gestão já estava cadastrada no
  // momento da criação do Evento — nunca é recalculado depois. Um Evento
  // criado antes disso (ou criado por uma automação que não resolveu a
  // Gestão) fica com `boardTermId: null` pra sempre, mesmo com a data
  // caindo dentro do período de uma Gestão já cadastrada agora. Filtrar só
  // por `boardTermId` escondia esses Eventos do filtro sem aviso nenhum —
  // aqui a Gestão efetiva é recalculada pela data quando o campo estiver
  // vazio, então o filtro sempre reflete a Gestão real do Evento.
  const effectiveBoardTermId = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const event of events) {
      if (event.boardTermId) {
        map.set(event.id, event.boardTermId);
        continue;
      }
      const term = boardTerms.find(
        (candidate) =>
          event.dataInicio >= candidate.periodoInicio &&
          (!candidate.periodoFim || event.dataInicio <= candidate.periodoFim),
      );
      map.set(event.id, term?.id ?? null);
    }
    return map;
  }, [events, boardTerms]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    return events
      .filter((event) => !boardTermFilter || effectiveBoardTermId.get(event.id) === boardTermFilter)
      .filter((event) => {
        if (!normalizedQuery) return true;
        const haystack = normalizeSearchText(
          `${event.titulo} ${event.local} ${formatEventDate(event.dataInicio)}`,
        );
        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime());
  }, [events, query, boardTermFilter, effectiveBoardTermId]);

  return (
    <div className="border-border bg-surface rounded-xl border p-6 shadow-sm">
      <StepTitle
        n={1}
        title="A qual acontecimento este conteúdo pertence?"
        text="Escolha um evento da Agenda. A Gestão é identificada automaticamente pela data."
      />

      {drafts.length > 0 && (
        <div className="mb-5 flex flex-col gap-2">
          <p className="text-sm font-medium">Continuar rascunho</p>
          <ul className="flex flex-col gap-2">
            {drafts.slice(0, 8).map((draft) => (
              <li key={draft.id}>
                <button
                  type="button"
                  onClick={() => onResumeDraft(draft)}
                  className="border-border hover:bg-bg flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm"
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
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Input
          placeholder="Pesquisar por título ou data…"
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
          + Cadastrar evento retroativo
        </Button>
      </div>

      {showCreateForm && (
        <div className="mb-4">
          <CreateEventInlineForm
            onCreated={(event) => {
              setShowCreateForm(false);
              onEventSelected(event, null);
            }}
          />
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <EmptyState
          title="Nenhum evento encontrado"
          description="Ajuste a busca ou cadastre o evento retroativamente."
        />
      ) : (
        <div className="grid max-h-[520px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {filteredEvents.map((event) => {
            const [day, month] = calendarBadgeParts(event.dataInicio);
            const counts = mediaCountsByEventId[event.id] ?? EMPTY_COUNTS;
            const hasMedia = counts.foto + counts.video + counts.audio + counts.documento > 0;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onEventSelected(event, null)}
                className="border-border hover:border-primary/40 flex flex-col rounded-lg border p-4 text-left transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="bg-primary flex flex-col items-center justify-center rounded-md px-2.5 py-1 text-xs font-bold text-white">
                    {day}
                    <small className="text-[8px] font-semibold">{month}</small>
                  </span>
                  <Badge variant="accent">{EVENT_KIND_LABELS[event.tipo]}</Badge>
                  {effectiveBoardTermId.get(event.id) && (
                    <span className="text-muted ml-auto text-[11px]">
                      {boardTermNameById.get(effectiveBoardTermId.get(event.id)!) ?? 'Gestão'}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-sm font-semibold">{event.titulo}</h3>
                <p className="text-muted mt-1 text-xs">⌖ {event.local}</p>
                <footer className="text-muted border-border mt-3 flex gap-4 border-t pt-2.5 text-[11px]">
                  {hasMedia ? (
                    <>
                      <span>{counts.foto} fotos</span>
                      <span>{counts.video} vídeos</span>
                      <span>{counts.documento} docs</span>
                    </>
                  ) : (
                    <span>Nenhum arquivo enviado ainda</span>
                  )}
                </footer>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
