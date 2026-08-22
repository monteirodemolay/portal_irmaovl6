'use client';

import { useState, useTransition } from 'react';
import { Badge, Button, Card, CardContent, EmptyState } from '@vl6/ui';
import {
  loadTrashAction,
  restoreArchiveItemFromTrashAction,
  restoreArchiveMediaFromTrashAction,
  type TrashListing,
} from '../actions/trash-actions';

export interface TrashManagerProps {
  initialTrash: TrashListing;
}

/** Client component da lixeira — listar + restaurar, `/admin/acervo/lixeira` (Fase 3). */
export function TrashManager({ initialTrash }: TrashManagerProps) {
  const [trash, setTrash] = useState(initialTrash);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function restoreItem(id: string) {
    startTransition(async () => {
      const result = await restoreArchiveItemFromTrashAction(id);
      if (result.ok) {
        setMessage('Item restaurado.');
        setTrash(await loadTrashAction());
      } else {
        setMessage(result.error ?? 'Não foi possível restaurar.');
      }
    });
  }

  function restoreMedia(id: string) {
    startTransition(async () => {
      const result = await restoreArchiveMediaFromTrashAction(id);
      if (result.ok) {
        setMessage('Mídia restaurada.');
        setTrash(await loadTrashAction());
      } else {
        setMessage(result.error ?? 'Não foi possível restaurar.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <p className="font-medium">Eventos do Acervo na lixeira ({trash.items.length})</p>
          {trash.items.length === 0 ? (
            <EmptyState title="Nenhum item do Acervo na lixeira." />
          ) : (
            <ul className="flex flex-col gap-2">
              {trash.items.map((item) => (
                <li
                  key={item.id}
                  className="border-border flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm"
                >
                  <span className="truncate">{item.titulo}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Excluído</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => restoreItem(item.id)}
                    >
                      Restaurar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <p className="font-medium">Mídias individuais na lixeira ({trash.medias.length})</p>
          {trash.medias.length === 0 ? (
            <EmptyState title="Nenhuma mídia individual na lixeira." />
          ) : (
            <ul className="flex flex-col gap-2">
              {trash.medias.map((media) => (
                <li
                  key={media.id}
                  className="border-border flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm"
                >
                  <span className="truncate">{media.originalName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Excluída</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => restoreMedia(media.id)}
                    >
                      Restaurar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
