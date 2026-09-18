'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@vl6/ui';
import {
  crossReferenceDemolayRosterAction,
  type CrossReferenceDemolayRosterActionState,
} from '../actions/import-demolay-roster-actions';

const EMPTY_STATE: CrossReferenceDemolayRosterActionState = { error: null, report: null };

const STATUS_LABEL: Record<string, string> = {
  vinculado: 'Vinculado agora',
  'já estava vinculado': 'Já estava vinculado',
  'sem correspondência': 'Sem correspondência',
  revisar: 'Revisar',
};

export function CrossReferenceDemolayRosterForm() {
  const [state, formAction] = useActionState<CrossReferenceDemolayRosterActionState, FormData>(
    crossReferenceDemolayRosterAction,
    EMPTY_STATE,
  );

  const vinculados = state.report?.filter((r) => r.status === 'vinculado').length ?? 0;
  const paraRevisar = state.report?.filter((r) => r.status === 'revisar') ?? [];

  return (
    <div className="border-border bg-background rounded-xl border border-dashed p-4">
      <p className="text-sm font-semibold">Cruzar com Irmãos já cadastrados</p>
      <p className="text-muted mt-1 text-xs">
        Compara os nomes dos integrantes importados com os Irmãos já cadastrados na VL6 — quem tem o
        mesmo nome (por exemplo, entrou no DeMolay antes de ser iniciado na Maçonaria) é vinculado
        nos dois cadastros: o integrante passa a apontar pro Irmão, e o vínculo com o DeMolay entra
        em Família e Legado do próprio Irmão. Só vincula nome idêntico — nome parecido fica marcado
        pra revisão manual, nada é vinculado sozinho por parecença.
      </p>
      <form action={formAction} className="mt-3">
        {state.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
        <SubmitButton />
      </form>

      {state.report && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm">
            {vinculados} vínculo(s) criado(s) agora. {state.report.length} nome(s) processados.
          </p>

          {paraRevisar.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">
                {paraRevisar.length} nome(s) parecido(s) com um Irmão cadastrado — não foram
                vinculados, confira manualmente:
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-amber-800">
                {paraRevisar.map((row) => (
                  <li key={row.nomeCompleto}>
                    <span className="font-medium">{row.nomeCompleto}</span> — pode ser{' '}
                    {row.sugestaoNomeParecido}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-border max-h-72 overflow-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-muted sticky top-0 text-xs uppercase">
                <tr>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {state.report.map((row, index) => (
                  <tr key={index} className="border-border border-t">
                    <td className="p-3">{row.nomeCompleto}</td>
                    <td className="text-muted p-3">{STATUS_LABEL[row.status] ?? row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? 'Cruzando…' : 'Cruzar nomes'}
    </Button>
  );
}
