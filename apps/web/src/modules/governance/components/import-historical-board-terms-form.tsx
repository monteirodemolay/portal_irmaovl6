'use client';

import { useActionState, useState, type FormEvent } from 'react';
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

// O Next.js aceita até 20 MB por envio de Server Action
// (`serverActions.bodySizeLimit`, next.config.ts) — acima disso, o envio é
// rejeitado ANTES do código da aplicação rodar: sem log, sem mensagem
// amigável, só a tela de erro genérica. Travamos bem abaixo disso (15 MB)
// pra sobrar margem pro resto do formulário e nunca deixar o Irmão trombar
// nesse limite sem explicação.
const MAX_BATCH_BYTES = 15 * 1024 * 1024;

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportHistoricalBoardTermsForm() {
  const [state, formAction] = useActionState<ImportHistoricalBoardTermsActionState, FormData>(
    importHistoricalBoardTermsAction,
    EMPTY_STATE,
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const overLimit = totalBytes > MAX_BATCH_BYTES;

  function handleFilesChange(files: FileList | null) {
    const list = files ? Array.from(files) : [];
    setSelectedFiles(list);
    const total = list.reduce((sum, file) => sum + file.size, 0);
    setSizeError(
      total > MAX_BATCH_BYTES
        ? `Esse lote tem ${formatMegabytes(total)} — o limite por envio é ${formatMegabytes(MAX_BATCH_BYTES)}. Selecione menos fotos e importe em mais de uma vez.`
        : null,
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (overLimit) {
      event.preventDefault();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label
          htmlFor="fotos"
          className="border-border hover:border-accent bg-background flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed p-8 text-center transition-colors"
        >
          <Camera size={28} strokeWidth={1.5} className="text-muted" />
          <span className="text-sm font-medium">
            {selectedFiles.length > 0
              ? `${selectedFiles.length} ${selectedFiles.length === 1 ? 'foto selecionada' : 'fotos selecionadas'} — ${formatMegabytes(totalBytes)}`
              : 'Clique para selecionar as fotos dos ex-Veneráveis'}
          </span>
          <span className="text-muted text-xs">
            Selecione poucas fotos por vez (até {formatMegabytes(MAX_BATCH_BYTES)} no total) e
            importe em mais de uma vez — não precisa mandar tudo de uma vez. JPG, PNG ou WEBP, até 5
            MB cada.
          </span>
          <input
            id="fotos"
            name="fotos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => handleFilesChange(event.target.files)}
          />
        </label>

        {sizeError && <p className="text-sm text-red-600">{sizeError}</p>}
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <SubmitButton disabled={overLimit} />
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
          {state.report.some((row) => row.memberStatus === 'revisar') && (
            <p className="text-sm text-amber-700">
              {state.report.filter((row) => row.memberStatus === 'revisar').length} vínculo(s) NÃO
              foram criados por parecerem o mesmo Irmão já cadastrado com o nome grafado diferente —
              veja a coluna "Cadastro" e confirme antes de reimportar. Nada foi duplicado.
            </p>
          )}
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
                  <tr
                    key={index}
                    className={`border-border border-t ${row.memberStatus === 'revisar' ? 'bg-amber-50' : ''}`}
                  >
                    <td className="p-3">{row.gestaoNome}</td>
                    <td className="p-3">{getBoardPositionLabel(row.cargo)}</td>
                    <td className="p-3 font-medium">{row.nomeCompleto}</td>
                    <td className="p-3">
                      {row.memberStatus === 'revisar' ? (
                        <span className="font-medium text-amber-700">
                          Revisar — pode ser {row.sugestaoNomeParecido}
                        </span>
                      ) : (
                        row.memberStatus
                      )}
                    </td>
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

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} className="w-fit">
      {pending ? 'Importando…' : 'Importar nominata'}
    </Button>
  );
}
