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
  type FileMigrationCandidateView,
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
  events: Event[];
}

/**
 * Saneamento do legado orientado por Acontecimento. Biblioteca não entra
 * aqui: obra bibliográfica é domínio próprio e não deve ser forçada a um
 * Evento apenas para caber no Acervo. Galeria/Arquivos só são migrados
 * quando o Administrador identifica o acontecimento histórico real.
 */
export function MigrationManager({
  galleryCandidates,
  fileCandidates,
  events,
}: MigrationManagerProps) {
  return (
    <Tabs defaultValue="galeria">
      <TabsList>
        <TabsTrigger value="galeria">Galeria antiga ({galleryCandidates.length})</TabsTrigger>
        <TabsTrigger value="arquivos">Arquivos antigos ({fileCandidates.length})</TabsTrigger>
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
          emptyDescription="Toda a Galeria antiga já está interligada ao Acervo canônico, ou não há álbuns legados."
          confirmNote="O álbum original permanece como proveniência e deixa de aparecer como cópia concorrente nas telas públicas."
        />
      </TabsContent>

      <TabsContent value="arquivos" className="mt-4">
        <div className="border-border bg-background mb-4 rounded-xl border p-4 text-sm">
          <strong>Somente arquivos que pertencem a um acontecimento.</strong>{' '}
          <span className="text-muted">
            Atas, documentos institucionais e patrimônio documental independente continuam no domínio de Documentos; não inventamos um Evento para migrá-los.
          </span>
        </div>
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
          emptyTitle="Nenhum arquivo pendente de vínculo"
          emptyDescription="Não há arquivos legados aguardando conferência."
          confirmNote="O arquivo original permanece preservado como proveniência e não é apagado."
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
          <p className="font-medium">Aguardando vínculo ({candidates.length})</p>
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
                      Interligado ao Acervo.{' '}
                      <Link href="/admin/publicacoes" className="underline">
                        Abrir acompanhamento
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
              Selecione um {nounSingular} para indicar o acontecimento real ao qual ele pertence.
            </p>
          ) : (
            <>
              <div>
                <p className="font-medium">{selected.titulo}</p>
                <p className="text-muted text-xs">{selected.meta}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Buscar acontecimento por título ou local…"
                  value={eventQuery}
                  onChange={(event) => setEventQuery(event.target.value)}
                />
                {filteredEvents.length === 0 ? (
                  <EmptyState title="Nenhum acontecimento encontrado" />
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
                Interligar este {nounSingular}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar vínculo e migração</DialogTitle>
            <DialogDescription>
              Será criado o registro canônico de <strong>{selected?.titulo}</strong> ligado ao acontecimento selecionado. {confirmNote}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={isPending} onClick={confirmMigration}>
              {isPending ? 'Interligando…' : 'Confirmar vínculo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
