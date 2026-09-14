'use client';

import { useState, useTransition } from 'react';
import { Button } from '@vl6/ui';
import { backfillMestreInstaladoTitlesAction } from '../actions/backfill-mestre-instalado-titles-action';

export function BackfillMestreInstaladoTitlesButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const state = await backfillMestreInstaladoTitlesAction();
      if (state.error) {
        setError(state.error);
        return;
      }
      const { totalExVeneraveis, titulosConcedidos } = state.result!;
      setMessage(
        titulosConcedidos > 0
          ? `${titulosConcedidos} título(s) de Mestre Instalado concedido(s) — de ${totalExVeneraveis} ex-Venerável(is) no total.`
          : `Nenhum título novo a conceder — todos os ${totalExVeneraveis} ex-Venerável(is) já têm o título.`,
      );
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? 'Concedendo…' : 'Conceder Mestre Instalado retroativamente'}
      </Button>
      {message && <p className="text-muted text-xs">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
