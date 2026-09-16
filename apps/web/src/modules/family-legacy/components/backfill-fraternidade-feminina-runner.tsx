'use client';

import { useState, useTransition } from 'react';
import { Button } from '@vl6/ui';
import { backfillFraternidadeFemininaAction } from '../actions/family-legacy-actions';

export function BackfillFraternidadeFemininaRunner() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const state = await backfillFraternidadeFemininaAction();
      if (state.error) {
        setError(state.error);
        return;
      }
      const { totalConjuges, corrigidos } = state.result!;
      setMessage(
        totalConjuges === 0
          ? 'Nenhum vínculo conjugal encontrado.'
          : corrigidos.length === 0
            ? `Todos os ${totalConjuges} cônjuge(s) já tinham o registro de Fraternidade Feminina.`
            : `${corrigidos.length} registro(s) de Fraternidade Feminina criado(s), de ${totalConjuges} cônjuge(s) verificado(s).`,
      );
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" onClick={handleRun} disabled={isPending}>
        {isPending ? 'Registrando…' : 'Registrar Fraternidade Feminina retroativamente'}
      </Button>
      {message && <p className="text-muted text-xs">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
