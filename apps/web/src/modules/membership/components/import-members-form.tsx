'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Badge, Button } from '@vl6/ui';
import { importMembersAction, type ImportMembersActionState } from '../actions/member-actions';

const EMPTY_STATE: ImportMembersActionState = { error: null, resultados: null };

export function ImportMembersForm() {
  const [state, formAction] = useActionState<ImportMembersActionState, FormData>(
    importMembersAction,
    EMPTY_STATE,
  );
  const criados = state.resultados?.filter((r) => r.status === 'criado').length ?? 0;
  const erros = state.resultados?.filter((r) => r.status === 'erro') ?? [];

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="border-border flex flex-col gap-4 rounded-lg border p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="planilha" className="text-sm font-medium">
            Planilha (.xlsx)
          </label>
          <input
            id="planilha"
            name="planilha"
            type="file"
            accept=".xlsx"
            required
            className="text-sm"
          />
          <p className="text-muted text-xs">
            Mesmas colunas da exportação: Nome, CIM, Grau, Situação, E-mail, Cidade. Só Nome é
            obrigatório — deixe E-mail em branco pra o Irmão reivindicar o próprio acesso depois em
            "Reivindicar meu cadastro".
          </p>
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <SubmitButton />
      </form>

      {state.resultados && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            <strong>{criados}</strong> Irmãos importados
            {erros.length > 0 && (
              <>
                {' '}
                · <strong>{erros.length}</strong> com erro
              </>
            )}
          </p>
          {erros.length > 0 && (
            <div className="border-border overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-background">
                  <tr>
                    <th className="p-2 text-left">Linha</th>
                    <th className="p-2 text-left">Nome</th>
                    <th className="p-2 text-left">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {erros.map((r) => (
                    <tr key={r.linha}>
                      <td className="p-2">{r.linha}</td>
                      <td className="p-2">{r.nome}</td>
                      <td className="p-2">
                        <Badge variant="destructive">{r.motivo}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Importando…' : 'Importar'}
    </Button>
  );
}
