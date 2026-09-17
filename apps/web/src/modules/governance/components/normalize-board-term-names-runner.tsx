'use client';

import { useState, useTransition } from 'react';
import { Button } from '@vl6/ui';
import { normalizeBoardTermNamesAction } from '../actions/governance-actions';

/**
 * Botão de correção em massa — tira o "Gestão " redundante do nome de
 * toda gestão já cadastrada, sem precisar abrir uma por uma. Seguro
 * clicar mais de uma vez (idempotente).
 */
export function NormalizeBoardTermNamesRunner() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const state = await normalizeBoardTermNamesAction();
      if (state.error) {
        setError(state.error);
        return;
      }
      const { corrigidas } = state.result!;
      setMessage(
        corrigidas.length === 0
          ? 'Nenhum nome de gestão precisava de correção.'
          : `${corrigidas.length} gestão(ões) corrigida(s): ${corrigidas
              .map((c) => `"${c.nomeAnterior}" → "${c.nomeNovo}"`)
              .join(', ')}.`,
      );
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button type="button" variant="outline" onClick={handleRun} disabled={isPending}>
        {isPending ? 'Corrigindo…' : 'Tirar "Gestão" repetido dos nomes'}
      </Button>
      {message && <p className="text-muted max-w-xs text-right text-xs">{message}</p>}
      {error && <p className="max-w-xs text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
