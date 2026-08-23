'use client';

import { useState, useTransition } from 'react';
import { Badge, Button, Card, CardContent, EmptyState } from '@vl6/ui';
import {
  deleteDuplicateArchiveMediaAction,
  loadDuplicateMediaGroupsAction,
  type DuplicateGroupView,
} from '../actions/duplicate-media-actions';

export interface DuplicateMediaManagerProps {
  initialGroups: DuplicateGroupView[];
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

/**
 * Revisão de duplicidade dedicada — client component de
 * `/admin/acervo/duplicidade` (Fase B "Publicação avançada"). Cada grupo é
 * um conjunto de `MediaAsset` com o mesmo `sha256`; o Administrador exclui
 * (soft delete) as `ArchiveMedia` redundantes, uma a uma, mantendo a que
 * decidir preservar.
 */
export function DuplicateMediaManager({ initialGroups }: DuplicateMediaManagerProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(archiveMediaId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteDuplicateArchiveMediaAction(archiveMediaId);
      if (!result.ok) {
        setMessage({ text: result.error ?? 'Não foi possível excluir.', error: true });
        return;
      }
      setMessage({ text: 'Mídia redundante movida para a lixeira.', error: false });
      setGroups(await loadDuplicateMediaGroupsAction());
    });
  }

  if (groups.length === 0) {
    return <EmptyState title="Nenhuma duplicidade encontrada no Acervo." />;
  }

  return (
    <div className="flex flex-col gap-6">
      {message && (
        <p className={`text-sm ${message.error ? 'text-red-600' : 'text-emerald-700'}`}>
          {message.text}
        </p>
      )}

      {groups.map((group) => (
        <Card key={group.sha256}>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">
                {group.assets.length} arquivos idênticos (mesmo conteúdo)
              </p>
              <Badge variant="outline">hash {group.sha256.slice(0, 10)}…</Badge>
            </div>

            <ul className="flex flex-col gap-3">
              {group.assets.map((asset) => (
                <li key={asset.id} className="border-border rounded border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="truncate text-sm font-medium">{asset.originalName}</p>
                      <p className="text-muted text-xs">
                        {formatBytes(asset.size)} · enviado em{' '}
                        {new Intl.DateTimeFormat('pt-BR').format(new Date(asset.createdAt))}
                      </p>
                    </div>
                  </div>

                  {asset.archiveMedias.length === 0 ? (
                    <p className="text-muted mt-2 text-xs">
                      Sem mídia do Acervo vinculada (só o arquivo bruto).
                    </p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {asset.archiveMedias.map((media) => (
                        <li
                          key={media.id}
                          className="border-border flex flex-wrap items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-sm"
                        >
                          <span className="truncate">
                            <span className="font-medium">{media.archiveItemTitulo}</span>
                            {media.caption ? ` — ${media.caption}` : ''}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleDelete(media.id)}
                          >
                            Excluir esta cópia
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
