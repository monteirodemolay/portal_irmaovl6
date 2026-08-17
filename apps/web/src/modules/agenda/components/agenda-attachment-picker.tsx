'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button, FileText, Input, X } from '@vl6/ui';
import { resolveAcervoItemAction } from '../actions/agenda-actions';

interface PickedAttachment {
  compositeId: string;
  titulo: string;
  kindLabel: string;
  viewHref: string;
}

/**
 * Picker leve de "Arquivos relacionados": o Administrador cola o link (ou
 * o ID) de um item já existente no Acervo VL6 — nunca faz upload aqui.
 * Cada item confirmado vira um `<input type="hidden" name="arquivosRelacionados">`
 * no formulário, coletado no servidor via `formData.getAll(...)`.
 */
export function AgendaAttachmentPicker({ initial = [] }: { initial?: PickedAttachment[] }) {
  const [attachments, setAttachments] = useState<PickedAttachment[]>(initial);
  const [rawInput, setRawInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    const value = rawInput.trim();
    if (!value) return;

    setError(null);
    startTransition(async () => {
      const result = await resolveAcervoItemAction(value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (attachments.some((item) => item.compositeId === result.item.compositeId)) {
        setError('Este item já foi adicionado.');
        return;
      }
      setAttachments((current) => [
        ...current,
        {
          compositeId: result.item.compositeId,
          titulo: result.item.titulo,
          kindLabel: result.item.kindLabel,
          viewHref: result.item.viewHref,
        },
      ]);
      setRawInput('');
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
          placeholder="Cole o link ou o ID do item do Acervo (/acervo/item/…)"
        />
        <Button type="button" variant="outline" disabled={isPending} onClick={handleAdd}>
          {isPending ? 'Buscando…' : 'Adicionar'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {attachments.length > 0 && (
        <ul className="flex flex-col gap-2">
          {attachments.map((item) => (
            <li
              key={item.compositeId}
              className="border-border flex items-center gap-2.5 rounded-lg border p-2.5"
            >
              <FileText size={16} strokeWidth={1.75} className="text-muted shrink-0" />
              <div className="min-w-0 flex-1">
                <Link href={item.viewHref} className="block truncate text-sm hover:underline">
                  {item.titulo}
                </Link>
                <p className="text-muted text-xs">{item.kindLabel}</p>
              </div>
              <input type="hidden" name="arquivosRelacionados" value={item.compositeId} />
              <button
                type="button"
                aria-label="Remover anexo"
                onClick={() =>
                  setAttachments((current) =>
                    current.filter((current2) => current2.compositeId !== item.compositeId),
                  )
                }
                className="text-muted hover:text-foreground shrink-0"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
