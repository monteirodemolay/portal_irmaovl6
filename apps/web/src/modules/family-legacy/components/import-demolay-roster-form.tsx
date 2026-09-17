'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@vl6/ui';
import {
  importDemolayRosterAction,
  type ImportDemolayRosterActionState,
} from '../actions/import-demolay-roster-actions';

const EMPTY_STATE: ImportDemolayRosterActionState = { error: null, report: null, entityId: null };

export function ImportDemolayRosterForm() {
  const [state, formAction] = useActionState<ImportDemolayRosterActionState, FormData>(
    importDemolayRosterAction,
    EMPTY_STATE,
  );

  const criados = state.report?.filter((r) => r.status === 'criado').length ?? 0;
  const jaExistiam = state.report?.filter((r) => r.status === 'já existia').length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction}>
        {state.error && <p className="mb-3 text-sm text-red-600">{state.error}</p>}
        <SubmitButton />
      </form>

      {state.report && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Importação concluída — <strong>{criados}</strong> integrante(s) criado(s),{' '}
            <strong>{jaExistiam}</strong> já existiam (nada duplicado).
          </p>
          {state.entityId && (
            <Link
              href={`/admin/pessoas/paramaconicas/${state.entityId}`}
              className="text-accent w-fit text-sm font-medium hover:underline"
            >
              Ver Integrantes do Capítulo →
            </Link>
          )}
          <div className="border-border max-h-96 overflow-auto rounded-xl border">
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
                    <td className="text-muted p-3">{row.status}</td>
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
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Importando…' : 'Importar nominata'}
    </Button>
  );
}
