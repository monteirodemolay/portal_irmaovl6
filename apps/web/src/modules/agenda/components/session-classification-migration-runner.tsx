'use client';

import { useState, useTransition } from 'react';
import type { SeedSessionClassificationReport } from '@vl6/domain';
import { SESSION_NATURE_LABELS, SESSION_TYPE_LABELS } from '@vl6/shared';
import {
  AlertTriangle,
  Badge,
  Button,
  CheckCircle2,
  DataTable,
  type DataTableColumn,
} from '@vl6/ui';
import { seedSessionClassificationAction } from '../actions/session-classification-migration-actions';

const COLUMNS: DataTableColumn<SeedSessionClassificationReport['migrados'][number]>[] = [
  { key: 'titulo', header: 'Sessão', cell: (r) => r.titulo },
  {
    key: 'tipo',
    header: 'Tipo sugerido',
    cell: (r) =>
      SESSION_TYPE_LABELS[r.sessionType as keyof typeof SESSION_TYPE_LABELS] ?? r.sessionType,
  },
  {
    key: 'natureza',
    header: 'Natureza sugerida',
    cell: (r) => SESSION_NATURE_LABELS[r.sessionNature] ?? r.sessionNature,
  },
  {
    key: 'status',
    header: 'Status',
    cell: (r) =>
      r.reviewRequired ? (
        <Badge variant="warning">
          <AlertTriangle size={12} className="mr-1 inline" />
          Revisão necessária
        </Badge>
      ) : (
        <Badge variant="success">
          <CheckCircle2 size={12} className="mr-1 inline" />
          Classificado
        </Badge>
      ),
  },
];

/**
 * Botão de disparo do backfill de classificação das Sessões — mesmo
 * padrão de `InitiationArchiveMigrationRunner`/
 * `GraduationArchiveMigrationRunner`. Nunca apaga/sobrescreve o título
 * original; só preenche a classificação estruturada nos campos novos.
 */
export function SessionClassificationMigrationRunner() {
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState<SeedSessionClassificationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    if (
      !window.confirm(
        'Isso vai analisar toda Sessão já cadastrada e preencher Tipo/Natureza/Grau/Acesso a ' +
          'partir do título e do grau legado — nunca apaga ou altera o título original. Casos ' +
          'ambíguos ficam marcados para revisão manual. Pode ser executado mais de uma vez, sem ' +
          'reprocessar quem já foi classificado. Continuar?',
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await seedSessionClassificationAction();
      setError(result.error);
      setReport(result.report);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" onClick={handleRun} disabled={isPending} className="w-fit">
        {isPending ? 'Executando…' : 'Executar backfill de classificação'}
      </Button>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {report && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {report.analisados} Sessão(ões) analisada(s) — {report.migrados.length} migrada(s)
            agora, {report.pulados} já estava(m) classificada(s) ou não é(são) Sessão.{' '}
            {report.pendentesRevisao > 0 && (
              <strong>{report.pendentesRevisao} precisa(m) de revisão manual.</strong>
            )}
          </p>
          {report.migrados.length > 0 && (
            <DataTable columns={COLUMNS} rows={report.migrados} getRowId={(r) => r.eventId} />
          )}
        </div>
      )}
    </div>
  );
}
