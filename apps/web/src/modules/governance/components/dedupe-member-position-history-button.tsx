'use client';

import { useState, useTransition } from 'react';
import { Button } from '@vl6/ui';
import { dedupeMemberPositionHistoryAction } from '../actions/dedupe-member-position-history-action';

export function DedupeMemberPositionHistoryButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const state = await dedupeMemberPositionHistoryAction();
      if (state.error) {
        setError(state.error);
        return;
      }
      const { totalRegistros, gruposDuplicados, registrosRemovidos } = state.result!;
      setMessage(
        registrosRemovidos > 0
          ? `${registrosRemovidos} registro(s) duplicado(s) removido(s) em ${gruposDuplicados} vínculo(s) — de ${totalRegistros} registros de histórico no total.`
          : `Nenhum registro duplicado encontrado — ${totalRegistros} registros de histórico no total.`,
      );
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? 'Verificando…' : 'Verificar e limpar duplicados'}
      </Button>
      {message && <p className="text-muted text-xs">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
