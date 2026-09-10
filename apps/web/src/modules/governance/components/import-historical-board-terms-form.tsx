'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { getBoardPositionLabel } from '@vl6/shared';
import { Button, Camera } from '@vl6/ui';
import {
  importHistoricalBoardTermsAction,
  type ImportHistoricalBoardTermsActionState,
} from '../actions/import-historical-board-terms-actions';

const EMPTY_STATE: ImportHistoricalBoardTermsActionState = {
  error: null,
  report: null,
  unmatchedFiles: [],
};

export function ImportHistoricalBoardTermsForm() {
  const [state, formAction] = useActionState<ImportHistoricalBoardTermsActionState, FormData>(
    importHistoricalBoardTermsAction,
    EMPTY_STATE,
  );
  const [fileCount, setFileCount] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
        <label
          htmlFor="fotos"
          className="border-border hover:border-accent bg-background flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center transition-colors"
        >
          <Camera size={28} strokeWidth={1.5} className="text-muted" />
          <span className="text-sm font-medium">
            {fileCount > 0
              ? `${fileCount} ${fileCount === 1 ? 'foto selecionada' : 'fotos selecionadas'}`
              : 'Clique para selecionar as fotos dos ex-Veneráveis'}
          </span>
          <span className="text-muted text-xs">
            Pode selecionar várias de uma vez, ou importar aos poucos — não precisa mandar tudo de
            uma vez. JPG, PNG ou WEBP, até 5 MB cada.
          </span>
          <input
            id="fotos"
            name="fotos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => setFileCount(event.target.files?.length ?? 0)}
          />
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <SubmitButton />
      </form>

      {state.unmatchedFiles.length > 0 && (
        <div className="border-border bg-background rounded-xl border border-dashed p-4">
          <p className="text-muted text-xs font-semibold uppercase tracking-wide">
            Fotos não reconhecidas
          </p>
          <ul className="text-muted mt-2 flex flex-col gap-1 text-xs">
            {state.unmatchedFiles.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        </div>
      )}

      {state.report && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">
            Importação concluída — {state.report.length} vínculos processados.
          </p>
          <div className="border-border overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-muted text-xs uppercase">
                <tr>
                  <th className="p-3">Gestão</th>
                  <th className="p-3">Cargo</th>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Cadastro</th>
                  <th className="p-3">Foto</th>
                </tr>
              </thead>
              <tbody>
                {state.report.map((row, index) => (
                  <tr key={index} className="border-border border-t">
                    <td className="p-3">{row.gestaoNome}</td>
                    <td className="p-3">{getBoardPositionLabel(row.cargo)}</td>
                    <td className="p-3 font-medium">{row.nomeCompleto}</td>
                    <td className="p-3">{row.memberStatus}</td>
                    <td className="p-3">{row.fotoAtualizada ? 'Atualizada agora' : '—'}</td>
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
