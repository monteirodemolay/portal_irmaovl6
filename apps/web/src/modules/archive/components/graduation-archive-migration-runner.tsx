'use client';

import { useState, useTransition } from 'react';
import {
  AlertTriangle,
  Badge,
  Button,
  CheckCircle2,
  DataTable,
  type DataTableColumn,
} from '@vl6/ui';

export interface GraduationArchiveMigrationReportRow {
  memberId: string;
  nomeCompleto: string;
  archiveItemId: string;
  eventCreated: boolean;
}

export interface GraduationArchiveMigrationReport {
  processados: GraduationArchiveMigrationReportRow[];
  pulados: number;
  erros: { memberId: string; nomeCompleto: string; mensagem: string }[];
}

interface GraduationArchiveMigrationState {
  error: string | null;
  report: GraduationArchiveMigrationReport | null;
}

const COLUMNS: DataTableColumn<GraduationArchiveMigrationReportRow>[] = [
  { key: 'nome', header: 'Irmão', cell: (r) => r.nomeCompleto },
  { key: 'item', header: 'Item do Acervo', cell: (r) => r.archiveItemId },
  {
    key: 'evento',
    header: 'Evento',
    cell: (r) =>
      r.eventCreated ? (
        <Badge variant="warning">
          <AlertTriangle size={12} className="mr-1 inline" />
          Criado automaticamente
        </Badge>
      ) : (
        <Badge variant="success">
          <CheckCircle2 size={12} className="mr-1 inline" />
          Evento já existente
        </Badge>
      ),
  },
];

/**
 * Botão de disparo do backfill retroativo, genérico para elevação e
 * exaltação — mesmo padrão visual de `InitiationArchiveMigrationRunner`
 * (docs/architecture/11-acervo-vl6.md §11.5), parametrizado por `action`
 * pra não duplicar o componente inteiro pelas duas telas.
 */
export function GraduationArchiveMigrationRunner({
  action,
  confirmMessage,
  emptyMessage,
  itemLabel,
}: {
  action: () => Promise<GraduationArchiveMigrationState>;
  confirmMessage: string;
  emptyMessage: string;
  itemLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState<GraduationArchiveMigrationReportRow[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [errors, setErrors] = useState<{ nomeCompleto: string; mensagem: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    if (!window.confirm(confirmMessage)) return;
    startTransition(async () => {
      const result = await action();
      setError(result.error);
      setReport(result.report?.processados ?? null);
      setSkipped(result.report?.pulados ?? 0);
      setErrors(result.report?.erros ?? []);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" onClick={handleRun} disabled={isPending} className="w-fit">
        {isPending ? 'Executando…' : 'Executar backfill'}
      </Button>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {report && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {report.length === 0
              ? emptyMessage
              : `${report.length} item(ns) criado(s). ${skipped} Irmão(s) ficou(ram) de fora (sem ${itemLabel}, ou já tinha item).`}
          </p>
          {report.length > 0 && (
            <DataTable columns={COLUMNS} rows={report} getRowId={(r) => r.memberId} />
          )}
          {errors.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-destructive text-sm font-medium">
                {errors.length} Irmão(s) não pôde(puderam) ser processado(s):
              </p>
              <ul className="text-destructive list-inside list-disc text-sm">
                {errors.map((e) => (
                  <li key={e.nomeCompleto}>
                    {e.nomeCompleto}: {e.mensagem}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
