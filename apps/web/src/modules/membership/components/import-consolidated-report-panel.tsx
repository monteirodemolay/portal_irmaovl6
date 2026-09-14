'use client';

import { useState, useTransition } from 'react';
import { Button } from '@vl6/ui';
import type { ImportConsolidatedReportResultRow } from '@vl6/domain';
import { importConsolidatedReportAction } from '../actions/import-consolidated-report-action';

const STATUS_LABEL: Record<ImportConsolidatedReportResultRow['status'], string> = {
  atualizado: 'Atualizado',
  sem_alteracao: 'Sem alteração (já preenchido)',
  nao_encontrado: 'Sem cadastro correspondente',
};

const STATUS_COLOR: Record<ImportConsolidatedReportResultRow['status'], string> = {
  atualizado: 'text-emerald-600',
  sem_alteracao: 'text-muted',
  nao_encontrado: 'text-destructive',
};

/**
 * Importação única (um clique) do "Relatório Consolidado de Datas" — dataset
 * já embutido em `consolidated-report-data.ts` (transcrito da planilha
 * fornecida pelo Administrador). Preenche data de iniciação, aniversário do
 * Irmão, cônjuge (nome + aniversário), data de casamento e aniversário de
 * familiares. Nunca sobrescreve dado já preenchido; o relatório de resultado
 * mostra o que foi atualizado e o que precisa de revisão manual (sem
 * cadastro correspondente por nome).
 */
export function ImportConsolidatedReportPanel() {
  const [isRunning, startRunning] = useTransition();
  const [results, setResults] = useState<ImportConsolidatedReportResultRow[] | null>(null);

  function handleRun() {
    startRunning(async () => {
      const outcome = await importConsolidatedReportAction();
      setResults(outcome);
    });
  }

  const naoEncontrados = results?.filter((r) => r.status === 'nao_encontrado') ?? [];
  const atualizados = results?.filter((r) => r.status === 'atualizado') ?? [];
  const semAlteracao = results?.filter((r) => r.status === 'sem_alteracao') ?? [];

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Importar Relatório Consolidado de Datas</p>
        <Button type="button" variant="outline" size="sm" onClick={handleRun} disabled={isRunning}>
          {isRunning ? 'Importando…' : 'Importar'}
        </Button>
      </div>
      <p className="text-muted text-xs">
        Vincula pelo nome ao cadastro já existente: data de iniciação, aniversário do Irmão
        (dia/mês), cônjuge (nome + aniversário), data de casamento e aniversário de familiares.
        Nunca sobrescreve um dado já preenchido.
      </p>

      {results && (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-muted text-xs">
            {atualizados.length} atualizado(s) · {semAlteracao.length} sem alteração ·{' '}
            {naoEncontrados.length} sem cadastro correspondente
          </p>

          {naoEncontrados.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-destructive text-xs font-semibold">
                Sem cadastro correspondente — revisar manualmente
              </p>
              <ul className="flex flex-col gap-1">
                {naoEncontrados.map((row, index) => (
                  <li key={index} className="text-muted flex items-start gap-2 text-xs">
                    <span className={STATUS_COLOR[row.status]} title={STATUS_LABEL[row.status]}>
                      ✗
                    </span>
                    <span>{row.nomeCompleto}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {atualizados.length > 0 && (
            <details className="text-xs">
              <summary className="text-muted cursor-pointer font-semibold">
                Ver {atualizados.length} atualizado(s)
              </summary>
              <ul className="mt-1.5 flex flex-col gap-1">
                {atualizados.map((row, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className={STATUS_COLOR[row.status]}>✓</span>
                    <span>
                      {row.nomeCompleto} — {row.camposAtualizados.join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
