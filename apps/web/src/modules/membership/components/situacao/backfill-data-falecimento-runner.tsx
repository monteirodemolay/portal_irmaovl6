'use client';

import { useState, useTransition } from 'react';
import { Button } from '@vl6/ui';
import { backfillDataFalecimentoAction } from '../../actions/member-actions';

export function BackfillDataFalecimentoRunner() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      setPendentes(null);
      const state = await backfillDataFalecimentoAction();
      if (state.error) {
        setError(state.error);
        return;
      }
      const { totalFalecidosSemData, corrigidos, semRegistroVigente } = state.result!;
      setMessage(
        totalFalecidosSemData === 0
          ? 'Nenhum Irmão pendente — todo In Memoriam já tem a data de falecimento registrada.'
          : `${corrigidos.length} data(s) de falecimento corrigida(s), de ${totalFalecidosSemData} pendente(s).`,
      );
      if (semRegistroVigente.length > 0) {
        setPendentes(semRegistroVigente.map((m) => m.nomeCompleto));
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" onClick={handleRun} disabled={isPending}>
        {isPending ? 'Corrigindo…' : 'Corrigir datas de falecimento em branco'}
      </Button>
      {message && <p className="text-muted text-xs">{message}</p>}
      {pendentes && pendentes.length > 0 && (
        <p className="text-xs text-amber-600">
          Sem histórico de Situação pra confirmar a data — revisar manualmente:{' '}
          {pendentes.join(', ')}.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
