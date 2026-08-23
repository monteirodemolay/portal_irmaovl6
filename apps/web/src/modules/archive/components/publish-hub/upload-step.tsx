'use client';

import { useEffect, useRef, useState } from 'react';
import type { Event } from '@vl6/domain';
import type { ArchiveMediaTypeKey } from '@vl6/shared';
import { Badge, Button, Card, CardContent } from '@vl6/ui';
import {
  loadArchiveItemSummaryAction,
  uploadArchiveMediaAction,
  uploadArchiveMediaPosterAction,
} from '../../actions/publish-hub-actions';
import { captureVideoPosterFrame } from '../../lib/capture-video-poster';
import { optimizeImageUpload } from '../../lib/optimize-image-upload';
import { UnifiedDropzone } from './unified-dropzone';
import { BatchMetadataPanel } from './batch-metadata-panel';

type QueueItemStatus = 'pendente' | 'enviando' | 'concluido' | 'erro';

interface QueueItem {
  id: string;
  fileName: string;
  fileSize: number;
  file: File | null;
  status: QueueItemStatus;
  mediaType: ArchiveMediaTypeKey | null;
  archiveMediaId: string | null;
  duplicateWarning: boolean;
  error: string | null;
  /** Preenchido quando a imagem foi redimensionada/recomprimida no browser antes do envio. */
  optimizedFrom: number | null;
}

const MEDIA_TYPE_LABELS: Record<ArchiveMediaTypeKey, string> = {
  foto: 'Foto',
  video: 'Vídeo',
  audio: 'Áudio',
  documento: 'Documento',
};

const STATUS_BADGE: Record<
  QueueItemStatus,
  { label: string; variant: 'default' | 'success' | 'destructive' | 'warning' }
> = {
  pendente: { label: 'Na fila', variant: 'default' },
  enviando: { label: 'Enviando…', variant: 'warning' },
  concluido: { label: 'Enviado', variant: 'success' },
  erro: { label: 'Falhou', variant: 'destructive' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CONCURRENCY_LIMIT = 3;

export interface UploadStepProps {
  event: Event;
  initialArchiveItemId: string | null;
  onBack: () => void;
  onContinue: (archiveItemId: string) => void;
}

/**
 * Passo 2 do wizard — coração da Central de Publicação
 * (docs/architecture/11-acervo-vl6.md §11.5). Cada arquivo vira uma
 * chamada independente a `uploadArchiveMediaAction` (Server Action por
 * arquivo, não um FormData único), disparadas com um limite de
 * concorrência para tolerar falha parcial: se um arquivo falhar, os demais
 * continuam e concluem.
 *
 * O primeiro arquivo do lote cria o `ArchiveItem` (quando não retomando um
 * rascunho existente); os demais reaproveitam o mesmo `archiveItemId` —
 * por isso o primeiro upload roda sozinho antes do restante entrar no pool
 * de concorrência, evitando criar mais de um item para o mesmo lote.
 */
export function UploadStep({ event, initialArchiveItemId, onBack, onContinue }: UploadStepProps) {
  const [archiveItemId, setArchiveItemId] = useState<string | null>(initialArchiveItemId);
  const archiveItemIdRef = useRef<string | null>(initialArchiveItemId);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(Boolean(initialArchiveItemId));

  useEffect(() => {
    if (!initialArchiveItemId) return;
    let cancelled = false;
    loadArchiveItemSummaryAction(initialArchiveItemId).then((summary) => {
      if (cancelled || !summary) return;
      setItems(
        summary.medias.map((media) => ({
          id: media.id,
          fileName: media.originalName,
          fileSize: media.size,
          file: null,
          status: 'concluido',
          mediaType: media.mediaType,
          archiveMediaId: media.id,
          duplicateWarning: false,
          error: null,
          optimizedFrom: null,
        })),
      );
      setIsLoadingExisting(false);
    });
    return () => {
      cancelled = true;
    };
  }, [initialArchiveItemId]);

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function uploadOne(item: QueueItem) {
    if (!item.file) return;
    updateItem(item.id, { status: 'enviando', error: null });
    try {
      let fileToUpload = item.file;

      // Compressão/otimização de imagem (Fase B "Publicação avançada") —
      // só imagens, e só quando o arquivo original justifica (dimensão ou
      // tamanho acima do limite). Falha aqui nunca impede o upload: o
      // arquivo original segue em frente.
      if (item.file.type.startsWith('image/')) {
        const optimized = await optimizeImageUpload(item.file);
        if (optimized.optimized) {
          fileToUpload = optimized.file;
          updateItem(item.id, {
            fileSize: optimized.optimizedSize,
            optimizedFrom: optimized.originalSize,
          });
        }
      }

      const formData = new FormData();
      formData.set('file', fileToUpload);
      formData.set('eventId', event.id);
      if (archiveItemIdRef.current) {
        formData.set('archiveItemId', archiveItemIdRef.current);
      }
      const result = await uploadArchiveMediaAction(formData);
      if (result.ok && result.archiveItemId) {
        if (!archiveItemIdRef.current) {
          archiveItemIdRef.current = result.archiveItemId;
          setArchiveItemId(result.archiveItemId);
        }
        updateItem(item.id, {
          status: 'concluido',
          mediaType: result.mediaType,
          archiveMediaId: result.archiveMediaId,
          duplicateWarning: result.duplicateWarning,
        });

        // Miniatura automática de vídeo (Fase B) — captura e envio SEMPRE
        // depois do vídeo principal já estar salvo; qualquer falha aqui é
        // silenciosa e nunca reflete no status do item (já concluído).
        if (result.mediaType === 'video' && result.archiveMediaId) {
          void generateAndUploadPoster(item.file, result.archiveMediaId);
        }
      } else {
        updateItem(item.id, { status: 'erro', error: result.error ?? 'Falha no envio.' });
      }
    } catch {
      updateItem(item.id, { status: 'erro', error: 'Falha inesperada no envio.' });
    }
  }

  async function generateAndUploadPoster(videoFile: File, archiveMediaId: string) {
    try {
      const posterBlob = await captureVideoPosterFrame(videoFile);
      if (!posterBlob) return;
      const posterFormData = new FormData();
      posterFormData.set('file', new File([posterBlob], 'miniatura.jpg', { type: 'image/jpeg' }));
      posterFormData.set('archiveMediaId', archiveMediaId);
      await uploadArchiveMediaPosterAction(posterFormData);
    } catch {
      // Tolerado em silêncio — o vídeo principal já foi salvo com sucesso.
    }
  }

  async function runQueue(newItems: QueueItem[]) {
    const pending = [...newItems];

    // O primeiro arquivo do lote cria o ArchiveItem — roda sozinho antes do
    // resto entrar no pool, para nunca criar mais de um item por lote.
    if (!archiveItemIdRef.current && pending.length > 0) {
      const first = pending.shift()!;
      await uploadOne(first);
    }

    let cursor = 0;
    async function worker() {
      while (cursor < pending.length) {
        const current = pending[cursor]!;
        cursor += 1;
        await uploadOne(current);
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY_LIMIT, pending.length) }, () => worker()),
    );
  }

  function handleFilesSelected(files: File[]) {
    const newItems: QueueItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      fileSize: file.size,
      file,
      status: 'pendente',
      mediaType: null,
      archiveMediaId: null,
      duplicateWarning: false,
      error: null,
      optimizedFrom: null,
    }));
    setItems((prev) => [...prev, ...newItems]);
    void runQueue(newItems);
  }

  function handleRetry(item: QueueItem) {
    void uploadOne(item);
  }

  const completedMediaIds = items
    .filter((item) => item.status === 'concluido' && item.archiveMediaId)
    .map((item) => item.archiveMediaId as string);
  const hasInFlight = items.some(
    (item) => item.status === 'enviando' || item.status === 'pendente',
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-5">
          <div>
            <p className="text-muted text-xs">Evento selecionado</p>
            <p className="font-medium">{event.titulo}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            Trocar evento
          </Button>
        </CardContent>
      </Card>

      <UnifiedDropzone onFilesSelected={handleFilesSelected} disabled={isLoadingExisting} />

      {items.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <p className="font-medium">Fila de envio ({items.length})</p>
            <ul className="flex flex-col gap-2">
              {items.map((item) => {
                const badge = STATUS_BADGE[item.status];
                return (
                  <li
                    key={item.id}
                    className="border-border flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{item.fileName}</span>
                      <span className="text-muted text-xs">
                        {formatFileSize(item.fileSize)}
                        {item.mediaType ? ` · ${MEDIA_TYPE_LABELS[item.mediaType]}` : ''}
                        {item.duplicateWarning ? ' · possível duplicata' : ''}
                      </span>
                      {item.optimizedFrom !== null && (
                        <span className="text-xs text-emerald-700">
                          Otimizada: {formatFileSize(item.optimizedFrom)} →{' '}
                          {formatFileSize(item.fileSize)}
                        </span>
                      )}
                      {item.error && <span className="text-xs text-red-600">{item.error}</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {item.status === 'erro' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(item)}
                        >
                          Tentar de novo
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {archiveItemId && completedMediaIds.length > 0 && (
        <BatchMetadataPanel
          archiveItemId={archiveItemId}
          targetArchiveMediaIds={completedMediaIds}
          onApplied={() => {}}
        />
      )}

      <p className="text-muted text-sm">
        Salvo automaticamente como rascunho a cada arquivo enviado — você pode sair e continuar
        depois pela lista &quot;Continuar rascunho&quot; do passo 1.
      </p>

      <div>
        <Button
          type="button"
          disabled={!archiveItemId || hasInFlight}
          onClick={() => archiveItemId && onContinue(archiveItemId)}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
}
