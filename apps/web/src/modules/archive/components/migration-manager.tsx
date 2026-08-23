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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@vl6/ui';
import { normalizeSearchText } from '../lib/archive-search-match';
import {
  migrateFileAssetAction,
  migrateGalleryAlbumAction,
  migrateLibraryItemAction,
  type FileMigrationCandidateView,
  type LibraryMigrationCandidateView,
  type MigrationCandidateView,
} from '../actions/migration-actions';

function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(value));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/** Formato comum consumido por `MigrationTypeManager`, independente do tipo legado de origem. */
interface GenericMigrationCandidate {
  id: string;
  titulo: string;
  meta: string;
  badge: string;
}

interface MigrationActionState {
  ok: boolean;
  error: string | null;
  archiveItemId: string | null;
}

export interface MigrationManagerProps {
  galleryCandidates: MigrationCandidateView[];
  fileCandidates: FileMigrationCandidateView[];
  libraryCandidates: LibraryMigrationCandidateView[];
  events: Event[];
}

/**
 * Client component da tela de Migração — `/admin/acervo/migracao`. Três
 * abas, uma por domínio legado (Galeria — Fase 5; Arquivos e Biblioteca —
 * Fase C "Administração & métricas"), cada uma reaproveitando o mesmo fluxo
 * de seleção: escolher o registro pendente, escolher o Evento real (nenhum
 * dos três domínios legados tem vínculo de evento de fato) e confirmar num
 * diálogo explícito antes de migrar — nunca em lote/automático.
 */
export function MigrationManager({
  galleryCandidates,
  fileCandidates,
  libraryCandidates,
  events,
}: MigrationManagerProps) {
  return (
    <Tabs defaultValue="galeria">
      <TabsList>
        <TabsTrigger value="galeria">Galeria ({galleryCandidates.length})</TabsTrigger>
        <TabsTrigger value="arquivos">Arquivos ({fileCandidates.length})</TabsTrigger>
        <TabsTrigger value="biblioteca">Biblioteca ({libraryCandidates.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="galeria" className="mt-4">
        <MigrationTypeManager
          candidates={galleryCandidates.map((album) => ({
            id: album.albumId,
            titulo: album.titulo,
            meta: `${formatDate(album.dataEvento)} · ${album.mediaCount} ${album.mediaCount === 1 ? 'mídia' : 'mídias'}`,
            badge: album.categoria,
          }))}
          events={events}
          migrateAction={migrateGalleryAlbumAction}
          nounSingular="álbum"
          emptyTitle="Nenhum álbum pendente de migração"
          emptyDescription="Todos os álbuns da Galeria já têm um Item do Acervo correspondente, ou a Galeria ainda não tem álbuns cadastrados."
          confirmNote="O álbum original na Galeria não é apagado nem alterado."
        />
      </TabsContent>

      <TabsContent value="arquivos" className="mt-4">
        <MigrationTypeManager
          candidates={fileCandidates.map((file) => ({
            id: file.fileId,
            titulo: file.titulo,
            meta: `${file.categoriaNome} · ${formatBytes(file.tamanhoBytes)}`,
            badge: file.tipoLabel,
          }))}
          events={events}
          migrateAction={migrateFileAssetAction}
          nounSingular="arquivo"
          emptyTitle="Nenhum arquivo pendente de migração"
          emptyDescription="Todos os arquivos já têm um Item do Acervo correspondente, ou Arquivos ainda não tem nenhum cadastrado."
          confirmNote="O arquivo original em Arquivos não é apagado nem alterado."
        />
      </TabsContent>

      <TabsContent value="biblioteca" className="mt-4">
        <MigrationTypeManager
          candidates={libraryCandidates.map((item) => ({
            id: item.libraryItemId,
            titulo: item.titulo,
            meta: `${item.categoriaNome} · ${formatBytes(item.tamanhoBytes)}`,
            badge: item.tipoLabel,
          }))}
          events={events}
          migrateAction={migrateLibraryItemAction}
          nounSingular="item da Biblioteca"
          emptyTitle="Nenhum item pendente de migração"
          emptyDescription="Todos os itens da Biblioteca já têm um Item do Acervo correspondente, ou a Biblioteca ainda não tem nenhum cadastrado."
          confirmNote="O item original na Biblioteca não é apagado nem alterado."
        />
      </TabsContent>
    </Tabs>
  );
}

interface MigrationTypeManagerProps {
  candidates: GenericMigrationCandidate[];
  events: Event[];
  migrateAction: (id: string, eventId: string) => Promise<MigrationActionState>;
  nounSingular: string;
  emptyTitle: string;
  emptyDescription: string;
  confirmNote: string;
}

function MigrationTypeManager({
  candidates,
  events,
  migrateAction,
  nounSingular,
  emptyTitle,
  emptyDescription,
  confirmNote,
}: MigrationTypeManagerProps) {
  const [selected, setSelected] = useState<GenericMigrationCandidate | null>(null);
  const [eventQuery, setEventQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Record<string, MigrationActionState>>({});

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

  function selectCandidate(candidate: GenericMigrationCandidate) {
    setSelected(candidate);
    setEventQuery('');
    setSelectedEventId(null);
  }

  function confirmMigration() {
    if (!selected || !selectedEventId) return;
    const candidateId = selected.id;
    startTransition(async () => {
      const outcome = await migrateAction(candidateId, selectedEventId);
      setResult((current) => ({ ...current, [candidateId]: outcome }));
      setConfirmOpen(false);
      if (outcome.ok) setSelected(null);
    });
  }

  if (candidates.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <p className="font-medium">Pendentes ({candidates.length})</p>
          <ul className="flex flex-col gap-2">
            {candidates.map((candidate) => {
              const outcome = result[candidate.id];
              return (
                <li key={candidate.id}>
                  <button
                    type="button"
                    onClick={() => selectCandidate(candidate)}
                    className={`border-border hover:bg-surface flex w-full items-center justify-between gap-3 rounded border px-4 py-3 text-left ${selected?.id === candidate.id ? 'bg-surface border-accent' : ''}`}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">{candidate.titulo}</span>
                      <span className="text-muted text-xs">{candidate.meta}</span>
                    </span>
                    <Badge variant="accent">{candidate.badge}</Badge>
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
              Selecione um {nounSingular} à esquerda para escolher o Evento real e migrar.
            </p>
          ) : (
            <>
              <div>
                <p className="font-medium">{selected.titulo}</p>
                <p className="text-muted text-xs">{selected.meta}</p>
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
                Migrar este {nounSingular}
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
              vinculado ao evento selecionado. {confirmNote}
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
