'use client';

import { useState, useTransition } from 'react';
import type { SeedMemberSituationHistoryReportRow } from '@vl6/domain';
import {
  AlertTriangle,
  Badge,
  Button,
  CheckCircle2,
  DataTable,
  type DataTableColumn,
} from '@vl6/ui';
import { seedMemberSituationHistoryAction } from '../../actions/member-actions';

const COLUMNS: DataTableColumn<SeedMemberSituationHistoryReportRow>[] = [
  { key: 'nome', header: 'Irmão', cell: (r) => r.nomeCompleto },
  { key: 'antiga', header: 'Status antigo', cell: (r) => r.situacaoAntiga },
  { key: 'nova', header: 'Situação nova', cell: (r) => r.situacaoNova },
  { key: 'motivo', header: 'Motivo', cell: (r) => r.motivoNovo },
  {
    key: 'revisao',
    header: 'Revisão',
    cell: (r) =>
      r.precisaRevisao ? (
        <Badge variant="warning">
          <AlertTriangle size={12} className="mr-1 inline" />
          {r.motivoRevisao ?? 'Revisar'}
        </Badge>
      ) : (
        <Badge variant="success">
          <CheckCircle2 size={12} className="mr-1 inline" />
          OK
        </Badge>
      ),
  },
];

export function SituacaoMigracaoRunner() {
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState<SeedMemberSituationHistoryReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    startTransition(async () => {
      const result = await seedMemberSituationHistoryAction();
      setError(result.error);
      setReport(result.report);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" onClick={handleRun} disabled={isPending} className="w-fit">
        {isPending ? 'Migrando…' : 'Executar migração'}
      </Button>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {report && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            {report.length === 0
              ? 'Nenhum Irmão pendente — todos já têm histórico registrado.'
              : `${report.length} registro(s) criado(s). ${report.filter((r) => r.precisaRevisao).length} pendente(s) de revisão manual.`}
          </p>
          {report.length > 0 && (
            <DataTable columns={COLUMNS} rows={report} getRowId={(r) => r.memberId} />
          )}
        </div>
      )}
    </div>
  );
}
