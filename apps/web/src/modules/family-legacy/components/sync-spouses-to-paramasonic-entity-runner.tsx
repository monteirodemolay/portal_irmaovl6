'use client';

import { useState, useTransition } from 'react';
import { Button } from '@vl6/ui';
import { syncSpousesToParamasonicEntityAction } from '../actions/paramasonic-entity-actions';

export function SyncSpousesToParamasonicEntityRunner({ entityId }: { entityId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [semConjuge, setSemConjuge] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      setSemConjuge(null);
      const state = await syncSpousesToParamasonicEntityAction(entityId);
      if (state.error) {
        setError(state.error);
        return;
      }
      const { totalConjugesCadastrados, adicionados, jaExistentes, irmaosSemConjugeCadastrado } =
        state.result!;
      setMessage(
        totalConjugesCadastrados === 0
          ? 'Nenhum Irmão com cônjuge cadastrado ainda.'
          : adicionados.length === 0
            ? `${jaExistentes} cônjuge(s) já estavam na lista de integrantes.`
            : `${adicionados.length} cônjuge(s) adicionado(s): ${adicionados.map((a) => `${a.nomeCompleto} (esposa de ${a.doIrmao})`).join(', ')}.${jaExistentes > 0 ? ` ${jaExistentes} já estavam na lista.` : ''}`,
      );
      if (irmaosSemConjugeCadastrado.length > 0) {
        setSemConjuge(irmaosSemConjugeCadastrado.map((m) => m.nomeCompleto));
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" onClick={handleRun} disabled={isPending}>
        {isPending ? 'Sincronizando…' : 'Sincronizar cônjuges dos Irmãos'}
      </Button>
      {message && <p className="text-muted text-xs">{message}</p>}
      {semConjuge && semConjuge.length > 0 && (
        <div className="text-xs text-amber-700">
          <p className="font-semibold">
            {semConjuge.length} Irmão(s) com estado civil que implica cônjuge, mas sem cônjuge
            cadastrado no perfil:
          </p>
          <ul className="mt-1 list-disc pl-4">
            {semConjuge.map((nome) => (
              <li key={nome}>{nome}</li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
