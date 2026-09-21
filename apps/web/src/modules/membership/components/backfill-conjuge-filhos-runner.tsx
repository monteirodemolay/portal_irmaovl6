'use client';

import { useState, useTransition } from 'react';
import { Button } from '@vl6/ui';
import {
  backfillConjugeEstadoCivilAction,
  dedupeMemberChildrenAction,
} from '../actions/member-actions';

/**
 * Dois botões de correção pontual (rodar uma vez, seguros de repetir),
 * achados investigando por que cônjuge/filhos não apareciam corretamente
 * em "Cadastro de Irmãos" depois da importação de aniversários — ver
 * `BackfillConjugeEstadoCivilUseCase`/`DedupeMemberChildrenUseCase`.
 */
export function BackfillConjugeFilhosRunner() {
  const [isPendingEstadoCivil, startEstadoCivilTransition] = useTransition();
  const [isPendingDedupe, startDedupeTransition] = useTransition();
  const [estadoCivilMessage, setEstadoCivilMessage] = useState<string | null>(null);
  const [dedupeMessage, setDedupeMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleBackfillEstadoCivil() {
    startEstadoCivilTransition(async () => {
      setError(null);
      setEstadoCivilMessage(null);
      const state = await backfillConjugeEstadoCivilAction();
      if (state.error) {
        setError(state.error);
        return;
      }
      const { totalSemEstadoCivil, corrigidos } = state.result!;
      setEstadoCivilMessage(
        totalSemEstadoCivil === 0
          ? 'Nenhum Irmão pendente — todo mundo com cônjuge cadastrada já tem estado civil.'
          : `${corrigidos.length} Irmão(s) marcado(s) como "Casado(a)" por já ter cônjuge cadastrada.`,
      );
    });
  }

  function handleDedupe() {
    startDedupeTransition(async () => {
      setError(null);
      setDedupeMessage(null);
      const state = await dedupeMemberChildrenAction();
      if (state.error) {
        setError(state.error);
        return;
      }
      const rows = state.result!;
      setDedupeMessage(
        rows.length === 0
          ? 'Nenhum filho duplicado encontrado.'
          : `${rows.reduce((total, row) => total + row.removidos.length, 0)} filho(s) duplicado(s) removido(s), em ${rows.length} Irmão(s).`,
      );
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleBackfillEstadoCivil}
          disabled={isPendingEstadoCivil}
        >
          {isPendingEstadoCivil ? 'Corrigindo…' : 'Marcar "Casado(a)" quem tem cônjuge'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDedupe}
          disabled={isPendingDedupe}
        >
          {isPendingDedupe ? 'Removendo…' : 'Remover filhos duplicados'}
        </Button>
      </div>
      {estadoCivilMessage && <p className="text-muted text-xs">{estadoCivilMessage}</p>}
      {dedupeMessage && <p className="text-muted text-xs">{dedupeMessage}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
