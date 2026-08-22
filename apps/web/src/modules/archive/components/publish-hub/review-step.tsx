'use client';

import { useEffect, useState } from 'react';
import { ARCHIVE_MEDIA_TYPE_LABELS, type ArchiveMediaTypeKey } from '@vl6/shared';
import { Badge, Button, Card, CardContent, EmptyState } from '@vl6/ui';
import {
  loadArchiveItemSummaryAction,
  type ArchiveItemSummary,
} from '../../actions/publish-hub-actions';

export interface ReviewStepProps {
  archiveItemId: string;
  onBack: () => void;
}

/**
 * Esqueleto do passo "Organizar / Publicar" (junta os passos 3 e 4 do
 * protótipo) — só confirma visualmente o que foi persistido no passo 2.
 * Sem drag-reorder, seleção de capa ou checklist de publicação: isso é
 * aprofundado na Fase 3 (docs/architecture/11-acervo-vl6.md §11.6).
 */
export function ReviewStep({ archiveItemId, onBack }: ReviewStepProps) {
  const [summary, setSummary] = useState<ArchiveItemSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    loadArchiveItemSummaryAction(archiveItemId).then((result) => {
      if (!cancelled) {
        setSummary(result);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [archiveItemId]);

  if (isLoading) {
    return <p className="text-muted text-sm">Carregando resumo…</p>;
  }

  if (!summary) {
    return <EmptyState title="Não foi possível carregar o resumo deste item." />;
  }

  const countsByType = summary.medias.reduce<Record<ArchiveMediaTypeKey, number>>(
    (acc, media) => {
      acc[media.mediaType] = (acc[media.mediaType] ?? 0) + 1;
      return acc;
    },
    { foto: 0, video: 0, audio: 0, documento: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div>
            <p className="text-muted text-xs">Item do Acervo (rascunho)</p>
            <p className="font-display text-lg font-semibold">{summary.titulo}</p>
            <p className="text-muted text-sm">Evento: {summary.eventoTitulo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(countsByType) as ArchiveMediaTypeKey[])
              .filter((type) => countsByType[type] > 0)
              .map((type) => (
                <Badge key={type} variant="accent">
                  {countsByType[type]} {ARCHIVE_MEDIA_TYPE_LABELS[type]}
                  {countsByType[type] > 1 ? 's' : ''}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2 p-5">
          <p className="font-medium">Arquivos enviados</p>
          <ul className="flex flex-col gap-1.5">
            {summary.medias.map((media) => (
              <li
                key={media.id}
                className="border-border flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span className="truncate">{media.originalName}</span>
                <Badge variant="success">Rascunho salvo</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-muted text-sm">
        Organizar (reordenar fotos, escolher capa e destaques) e o checklist final de publicação
        chegam na próxima fase — por enquanto, este item fica salvo como rascunho.
      </p>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          Voltar e enviar mais arquivos
        </Button>
      </div>
    </div>
  );
}
