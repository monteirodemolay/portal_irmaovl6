'use client';

import { useState, useTransition } from 'react';
import { Button } from '@vl6/ui';
import { backfillArchiveBoardTermLinksAction } from '../actions/governance-actions';

/**
 * Botão de correção em massa — recalcula o vínculo com a Gestão de
 * Eventos/itens do Acervo VL6 que ficaram sem (`boardTermId: null`), sem
 * precisar corrigir um por um. Seguro clicar mais de uma vez (idempotente
 * — só mexe em quem ainda está sem vínculo).
 */
export function BackfillArchiveBoardTermLinksRunner() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const state = await backfillArchiveBoardTermLinksAction();
      if (state.error) {
        setError(state.error);
        return;
      }
      const { eventosCorrigidos, itensCorrigidos } = state.result!;
      setMessage(
        eventosCorrigidos === 0 && itensCorrigidos === 0
          ? 'Nenhum evento ou item do Acervo VL6 estava sem vínculo com a Gestão.'
          : `${eventosCorrigidos} evento(s) e ${itensCorrigidos} item(ns) do Acervo VL6 vinculados à Gestão certa.`,
      );
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button type="button" variant="outline" onClick={handleRun} disabled={isPending}>
        {isPending ? 'Corrigindo…' : 'Vincular Iniciações/Elevações/Exaltações à Gestão'}
      </Button>
      {message && <p className="text-muted max-w-xs text-right text-xs">{message}</p>}
      {error && <p className="max-w-xs text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
