'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  BOARD_POSITION_KEYS,
  BOARD_POSITION_LABELS,
  MEMBER_DEGREES,
  MEMBER_SITUATION_STATUSES,
  MEMBER_SITUATION_STATUS_LABELS,
} from '@vl6/shared';
import { Button, Input, Select } from '@vl6/ui';
import { MEMBER_REPORT_COLUMNS } from '@/modules/membership/reports/member-report-columns';
import type { MemberReportFilters } from '@/modules/membership/reports/member-report-query';
import {
  buildMemberReportPreviewAction,
  type MemberReportPreview,
  type MemberReportPreviewState,
} from '../actions/member-actions';

const PREVIEW_EMPTY_STATE: MemberReportPreviewState = { report: null, error: null };

/**
 * Relatório de Irmãos em 2 telas: configurar (filtros + colunas) → prévia
 * (documento pronto pra imprimir/baixar). Mesmo padrão do wizard de
 * importação (`ImportMembersForm`) — uma rota só, fase decidida por qual
 * `useActionState` já tem resultado, reset via `key={attempt}` no pai.
 */
export function MemberReportWizard({ initialFilters }: { initialFilters: MemberReportFilters }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <ReportFlow
      key={attempt}
      initialFilters={initialFilters}
      onRestart={() => setAttempt((n) => n + 1)}
    />
  );
}

function ReportFlow({
  initialFilters,
  onRestart,
}: {
  initialFilters: MemberReportFilters;
  onRestart: () => void;
}) {
  const [previewState, previewAction] = useActionState<MemberReportPreviewState, FormData>(
    buildMemberReportPreviewAction,
    PREVIEW_EMPTY_STATE,
  );

  if (previewState.report) {
    return <PreviewStep report={previewState.report} onRestart={onRestart} />;
  }
  return (
    <ConfigStep
      initialFilters={initialFilters}
      previewAction={previewAction}
      error={previewState.error}
    />
  );
}

function ConfigStep({
  initialFilters,
  previewAction,
  error,
}: {
  initialFilters: MemberReportFilters;
  previewAction: (formData: FormData) => void;
  error: string | null;
}) {
  return (
    <form action={previewAction} className="flex flex-col gap-6">
      <div className="border-border flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Filtros</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Input name="nome" defaultValue={initialFilters.nome} placeholder="Nome…" />
          <Input name="cim" defaultValue={initialFilters.cim} placeholder="CIM…" />
          <Input name="cidade" defaultValue={initialFilters.cidade} placeholder="Cidade…" />
          <Select name="grau" defaultValue={initialFilters.grau ?? ''}>
            <option value="">Grau (todos)</option>
            {MEMBER_DEGREES.map((grau) => (
              <option key={grau} value={grau}>
                {grau}
              </option>
            ))}
          </Select>
          <Select name="situacao" defaultValue={initialFilters.situacao ?? ''}>
            <option value="">Situação (todas)</option>
            {MEMBER_SITUATION_STATUSES.map((situacao) => (
              <option key={situacao} value={situacao}>
                {MEMBER_SITUATION_STATUS_LABELS[situacao]}
              </option>
            ))}
          </Select>
          <Select name="cargo" defaultValue={initialFilters.cargo ?? ''}>
            <option value="">Cargo atual (todos)</option>
            {BOARD_POSITION_KEYS.map((cargo) => (
              <option key={cargo} value={cargo}>
                {BOARD_POSITION_LABELS[cargo]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="border-border flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Colunas</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-3">
          {MEMBER_REPORT_COLUMNS.map((column) => (
            <label key={column.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="colunas"
                value={column.key}
                defaultChecked={column.defaultSelected}
                className="accent-primary h-4 w-4"
              />
              {column.label}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <PreviewButton />
    </form>
  );
}

function PreviewButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Gerando prévia…' : 'Ver prévia'}
    </Button>
  );
}

function PreviewStep({
  report,
  onRestart,
}: {
  report: MemberReportPreview;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button type="button" onClick={() => window.print()}>
          Imprimir
        </Button>
        <Button asChild variant="outline">
          <a href={`/api/v1/admin/members/export?${report.exportQuery}&format=pdf`}>Baixar PDF</a>
        </Button>
        <Button asChild variant="outline">
          <a href={`/api/v1/admin/members/export?${report.exportQuery}&format=docx`}>Baixar Word</a>
        </Button>
        <Button asChild variant="outline">
          <a href={`/api/v1/admin/members/export?${report.exportQuery}&format=xlsx`}>
            Baixar Excel
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={`/api/v1/admin/members/export?${report.exportQuery}&format=csv`}>Baixar CSV</a>
        </Button>
        <Button type="button" variant="outline" onClick={onRestart}>
          Ajustar filtros
        </Button>
      </div>

      {report.hasMore && (
        <p className="text-sm text-amber-600 print:hidden">
          Mostrando os primeiros {report.totalShown} resultados — refine os filtros pra ver todos.
        </p>
      )}

      <MemberReportDocument report={report} />
    </div>
  );
}

function MemberReportDocument({ report }: { report: MemberReportPreview }) {
  return (
    <div className="border-border bg-surface rounded-lg border p-6 print:border-0 print:p-0 print:shadow-none">
      <div className="mb-4 flex flex-col items-center text-center">
        <p className="text-muted text-xs font-medium uppercase tracking-wide">
          {report.tenantNome}
        </p>
        <h2 className="font-display text-xl font-semibold">Relatório de Irmãos</h2>
        <p className="text-muted text-xs">
          {report.filtrosResumo} · Gerado em {report.geradoEm} · {report.totalShown} registro(s)
        </p>
      </div>
      <div className="border-border max-h-[520px] overflow-y-auto rounded-lg border print:max-h-none print:overflow-visible print:border-0">
        <table className="w-full text-sm">
          <thead className="bg-background sticky top-0 print:static">
            <tr>
              {report.columns.map((column) => (
                <th key={column.key} className="p-2 text-left">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {report.rows.map((row) => (
              <tr key={row.id}>
                {row.values.map((value, index) => (
                  <td key={index} className="p-2">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
