'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { MEMBER_SITUATION_STATUS_LABELS } from '@vl6/shared';
import { AlertTriangle, Badge, Button, CheckCircle2 } from '@vl6/ui';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';
import {
  confirmImportMembersAction,
  parseMembersFileAction,
  type ImportMembersActionState,
  type ImportPreviewRow,
  type ParseMembersFileState,
} from '../actions/member-actions';

const PARSE_EMPTY_STATE: ParseMembersFileState = { error: null, rows: null };
const CONFIRM_EMPTY_STATE: ImportMembersActionState = { error: null, resultados: null };

/**
 * Importação em massa em 3 telas: escolher arquivo → revisar/selecionar
 * cada linha reconhecida (nada é gravado ainda) → resultado final. A
 * troca de tela é reset de estado local (`attempt` como `key`), não
 * navegação — as duas Server Actions (`parseMembersFileAction`,
 * `confirmImportMembersAction`) são independentes de propósito, pra
 * `useActionState` de cada uma começar limpo a cada tentativa.
 */
export function ImportMembersForm() {
  const [attempt, setAttempt] = useState(0);
  return <ImportWizard key={attempt} onRestart={() => setAttempt((n) => n + 1)} />;
}

function ImportWizard({ onRestart }: { onRestart: () => void }) {
  const [parseState, parseAction] = useActionState<ParseMembersFileState, FormData>(
    parseMembersFileAction,
    PARSE_EMPTY_STATE,
  );
  const [confirmState, confirmAction] = useActionState<ImportMembersActionState, FormData>(
    confirmImportMembersAction,
    CONFIRM_EMPTY_STATE,
  );

  if (confirmState.resultados) {
    return <ResultStep resultados={confirmState.resultados} onRestart={onRestart} />;
  }
  if (parseState.rows) {
    return (
      <PreviewStep
        rows={parseState.rows}
        confirmAction={confirmAction}
        confirmError={confirmState.error}
        onRestart={onRestart}
      />
    );
  }
  return <UploadStep parseAction={parseAction} error={parseState.error} />;
}

function UploadStep({
  parseAction,
  error,
}: {
  parseAction: (formData: FormData) => void;
  error: string | null;
}) {
  return (
    <form action={parseAction} className="border-border flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="planilha" className="text-sm font-medium">
          Planilha (.xlsx) ou Relatório do módulo Irmãos (.pdf)
        </label>
        <input
          id="planilha"
          name="planilha"
          type="file"
          accept=".xlsx,.pdf"
          required
          className="text-sm"
        />
        <p className="text-muted text-xs">
          .xlsx: mesmas colunas da exportação (Nome, CIM, Grau, Situação, E-mail, Cidade) — só Nome
          é obrigatório, deixe E-mail em branco pra o Irmão reivindicar o próprio acesso depois em
          "Reivindicar meu cadastro". .pdf: o relatório de outro sistema (Nome, CIM, Loja, Grau) —
          nunca tem e-mail, e todo mundo entra com situação "Regular"; os Irmãos marcados por cor no
          PDF original (Desligado, Irregular, etc.) precisam ser ajustados à mão depois, pelo botão
          "Situação" na tela de cada um. Nada é gravado agora — na próxima tela você revisa e
          escolhe quem entra.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <AnalyzeButton />
    </form>
  );
}

function AnalyzeButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Analisando…' : 'Analisar arquivo'}
    </Button>
  );
}

function PreviewStep({
  rows,
  confirmAction,
  confirmError,
  onRestart,
}: {
  rows: ImportPreviewRow[];
  confirmAction: (formData: FormData) => void;
  confirmError: string | null;
  onRestart: () => void;
}) {
  const validRows = useMemo(() => rows.filter((row) => row.valido), [rows]);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(validRows.map((row) => row.linha)),
  );

  const selectedRows = rows.filter((row) => selected.has(row.linha));
  const allValidSelected =
    validRows.length > 0 && validRows.every((row) => selected.has(row.linha));

  function toggleRow(linha: number, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(linha);
      else next.delete(linha);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(validRows.map((row) => row.linha)) : new Set());
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-background flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
        <p>
          <strong>{rows.length}</strong> linhas reconhecidas — <strong>{validRows.length}</strong>{' '}
          prontas pra importar
          {rows.length > validRows.length && (
            <>
              {' '}
              · <strong>{rows.length - validRows.length}</strong> com problema (não selecionáveis)
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-muted">
            <strong>{selectedRows.length}</strong> selecionados
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => toggleAll(true)}>
            Selecionar todos
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => toggleAll(false)}>
            Limpar seleção
          </Button>
        </div>
      </div>

      <div className="border-border max-h-[480px] overflow-y-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-background sticky top-0">
            <tr>
              <th className="p-2 text-left">
                <input
                  type="checkbox"
                  className="accent-primary h-4 w-4"
                  checked={allValidSelected}
                  onChange={(event) => toggleAll(event.target.checked)}
                  aria-label="Selecionar todos"
                />
              </th>
              <th className="p-2 text-left">Nome</th>
              <th className="p-2 text-left">CIM</th>
              <th className="p-2 text-left">Grau</th>
              <th className="p-2 text-left">Situação</th>
              <th className="p-2 text-left">E-mail</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rows.map((row) => (
              <tr key={row.linha} className={row.valido ? undefined : 'opacity-60'}>
                <td className="p-2">
                  <input
                    type="checkbox"
                    className="accent-primary h-4 w-4"
                    disabled={!row.valido}
                    checked={selected.has(row.linha)}
                    onChange={(event) => toggleRow(row.linha, event.target.checked)}
                    aria-label={`Selecionar ${row.nome}`}
                  />
                </td>
                <td className="p-2">{row.nome}</td>
                <td className="p-2">{row.cim ?? '—'}</td>
                <td className="p-2">{MEMBER_DEGREE_LABELS[row.grau]}</td>
                <td className="p-2">{MEMBER_SITUATION_STATUS_LABELS[row.situacao]}</td>
                <td className="p-2">{row.email ?? '—'}</td>
                <td className="p-2">
                  {row.valido ? (
                    <Badge variant="success" className="inline-flex items-center gap-1">
                      <CheckCircle2 size={12} /> Pronto
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="inline-flex items-center gap-1">
                      <AlertTriangle size={12} /> {row.motivo}
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={confirmAction} className="flex flex-wrap items-center gap-3">
        <input
          type="hidden"
          name="linhas"
          value={JSON.stringify(
            selectedRows.map((row) => ({
              linha: row.linha,
              nome: row.nome,
              cim: row.cim,
              grau: row.grau,
              situacao: row.situacao,
              email: row.email,
            })),
          )}
        />
        <ConfirmButton count={selectedRows.length} />
        <Button type="button" variant="outline" onClick={onRestart}>
          Escolher outro arquivo
        </Button>
        {confirmError && <p className="text-sm text-red-600">{confirmError}</p>}
      </form>
    </div>
  );
}

function ConfirmButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || count === 0}>
      {pending
        ? 'Importando…'
        : `Importar ${count} Irmão${count === 1 ? '' : 's'} selecionado${count === 1 ? '' : 's'}`}
    </Button>
  );
}

function ResultStep({
  resultados,
  onRestart,
}: {
  resultados: NonNullable<ImportMembersActionState['resultados']>;
  onRestart: () => void;
}) {
  const criados = resultados.filter((r) => r.status === 'criado').length;
  const erros = resultados.filter((r) => r.status === 'erro');

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-background rounded-lg border p-4 text-sm">
        <p>
          <strong>{criados}</strong> Irmãos importados
          {erros.length > 0 && (
            <>
              {' '}
              · <strong>{erros.length}</strong> com erro
            </>
          )}
        </p>
      </div>
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
      <Button type="button" variant="outline" className="w-fit" onClick={onRestart}>
        Importar outro arquivo
      </Button>
    </div>
  );
}
