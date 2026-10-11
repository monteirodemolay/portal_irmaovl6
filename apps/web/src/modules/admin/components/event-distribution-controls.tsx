'use client';

import { useActionState } from 'react';
import { saveEventDistributionAction } from '../actions/event-distribution-actions';

export function EventDistributionControls({
  eventId,
  home,
  timeline,
}: {
  eventId: string;
  home: boolean;
  timeline: boolean;
}) {
  const [state, action, pending] = useActionState(saveEventDistributionAction.bind(null, eventId), {
    error: null,
  });
  return (
    <form action={action} className="border-border mt-5 scroll-mt-6 rounded-xl border p-4">
      <fieldset disabled={pending} className="space-y-3">
        <legend className="mb-3 font-semibold">Exibição do Acontecimento</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="exibirNaTelaInicial" defaultChecked={home} />
          Permitir na Tela Inicial (próximas sessões e eventos)
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="exibirNaLinhaDoTempo" defaultChecked={timeline} />
          Incluir na Linha do Tempo
        </label>
        <p className="text-muted text-sm">
          Notícias, avisos e mídias são publicados nos blocos abaixo. Esses controles não modificam
          suas publicações nem seus níveis de acesso.
        </p>
        <button
          type="submit"
          className="bg-primary min-h-11 rounded-xl px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {pending ? 'Salvando…' : 'Salvar distribuição'}
        </button>
      </fieldset>
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="mt-3 text-sm text-emerald-700">
          {state.success}
        </p>
      )}
    </form>
  );
}
