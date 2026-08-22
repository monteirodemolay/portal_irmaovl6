'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import type { Event } from '@vl6/domain';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
} from '@vl6/ui';
import { normalizeSearchText } from '../lib/archive-search-match';
import {
  migrateGalleryAlbumAction,
  type MigrationCandidateView,
} from '../actions/migration-actions';

function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(value));
}

export interface MigrationManagerProps {
  candidates: MigrationCandidateView[];
  events: Event[];
}

/**
 * Client component da tela de Migração — `/admin/acervo/migracao` (Fase
 * 5, docs/architecture/11-acervo-vl6.md §11.6e). Um álbum por vez: ao
 * selecionar, o admin escolhe o Evento real (o álbum legado só tem
 * `dataEvento` livre em texto, sem vínculo de fato) e confirma num
 * diálogo explícito antes de migrar — nunca em lote/automático.
 */
export function MigrationManager({ candidates, events }: MigrationManagerProps) {
  const [selected, setSelected] = useState<MigrationCandidateView | null>(null);
  const [eventQuery, setEventQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    Record<string, { ok: boolean; error: string | null; archiveItemId: string | null }>
  >({});

  const filteredEvents = useMemo(() => {
    const normalizedQuery = normalizeSearchText(eventQuery);
    return events
      .filter((event) => {
        if (!normalizedQuery) return true;
        const haystack = normalizeSearchText(`${event.titulo} ${event.local}`);
        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => b.dataInicio.getTime() - a.dataInicio.getTime())
      .slice(0, 30);
  }, [events, eventQuery]);

  function selectAlbum(candidate: MigrationCandidateView) {
    setSelected(candidate);
    setEventQuery('');
    setSelectedEventId(null);
  }

  function confirmMigration() {
    if (!selected || !selectedEventId) return;
    const albumId = selected.albumId;
    startTransition(async () => {
      const outcome = await migrateGalleryAlbumAction(albumId, selectedEventId);
      setResult((current) => ({ ...current, [albumId]: outcome }));
      setConfirmOpen(false);
      if (outcome.ok) setSelected(null);
    });
  }

  if (candidates.length === 0) {
    return (
      <EmptyState
        title="Nenhum álbum pendente de migração"
        description="Todos os álbuns da Galeria já têm um Item do Acervo correspondente, ou a Galeria ainda não tem álbuns cadastrados."
      />
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <p className="font-medium">Álbuns pendentes ({candidates.length})</p>
          <ul className="flex flex-col gap-2">
            {candidates.map((candidate) => {
              const outcome = result[candidate.albumId];
              return (
                <li key={candidate.albumId}>
                  <button
                    type="button"
                    onClick={() => selectAlbum(candidate)}
                    className={`border-border hover:bg-surface flex w-full items-center justify-between gap-3 rounded border px-4 py-3 text-left ${selected?.albumId === candidate.albumId ? 'bg-surface border-accent' : ''}`}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">{candidate.titulo}</span>
                      <span className="text-muted text-xs">
                        {formatDate(candidate.dataEvento)} · {candidate.mediaCount}{' '}
                        {candidate.mediaCount === 1 ? 'mídia' : 'mídias'}
                      </span>
                    </span>
                    <Badge variant="accent">{candidate.categoria}</Badge>
                  </button>
                  {outcome?.ok && (
                    <p className="mt-1 text-xs text-emerald-700">
                      Migrado.{' '}
                      <Link href="/admin/acervo/publicar" className="underline">
                        Continuar na Central de Publicação
                      </Link>
                      .
                    </p>
                  )}
                  {outcome && !outcome.ok && (
                    <p className="mt-1 text-xs text-red-700">{outcome.error}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          {!selected ? (
            <p className="text-muted text-sm">
              Selecione um álbum à esquerda para escolher o Evento real e migrar.
            </p>
          ) : (
            <>
              <div>
                <p className="font-medium">{selected.titulo}</p>
                <p className="text-muted text-xs">
                  Data cadastrada na Galeria: {formatDate(selected.dataEvento)} ·{' '}
                  {selected.mediaCount} {selected.mediaCount === 1 ? 'mídia' : 'mídias'}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Buscar evento por título ou local…"
                  value={eventQuery}
                  onChange={(event) => setEventQuery(event.target.value)}
                />
                {filteredEvents.length === 0 ? (
                  <EmptyState title="Nenhum evento encontrado" />
                ) : (
                  <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                    {filteredEvents.map((event) => (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedEventId(event.id)}
                          className={`border-border hover:bg-surface flex w-full items-center justify-between gap-3 rounded border px-3 py-2 text-left text-sm ${selectedEventId === event.id ? 'bg-surface border-accent' : ''}`}
                        >
                          <span className="flex flex-col">
                            <span className="font-medium">{event.titulo}</span>
                            <span className="text-muted text-xs">
                              {formatDate(event.dataInicio)} · {event.local}
                            </span>
                          </span>
                          {selectedEventId === event.id && (
                            <Badge variant="accent">Selecionado</Badge>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button
                type="button"
                disabled={!selectedEventId || isPending}
                onClick={() => setConfirmOpen(true)}
              >
                Migrar este álbum
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar migração</DialogTitle>
            <DialogDescription>
              Isto cria um novo Item do Acervo em rascunho para <strong>{selected?.titulo}</strong>,
              vinculado ao evento selecionado. O álbum original na Galeria não é apagado nem
              alterado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={isPending} onClick={confirmMigration}>
              {isPending ? 'Migrando…' : 'Confirmar migração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
