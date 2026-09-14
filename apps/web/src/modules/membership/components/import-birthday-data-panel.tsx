'use client';

import { useState, useTransition } from 'react';
import { Button } from '@vl6/ui';
import type { ImportBirthdayResultRow } from '@vl6/domain';
import { importBirthdayDataAction } from '../actions/import-birthday-data-action';

const STATUS_LABEL: Record<ImportBirthdayResultRow['status'], string> = {
  atualizado: 'Atualizado',
  ja_preenchido: 'Já preenchido (não alterado)',
  nao_encontrado: 'Sem cadastro correspondente',
};

const STATUS_COLOR: Record<ImportBirthdayResultRow['status'], string> = {
  atualizado: 'text-emerald-600',
  ja_preenchido: 'text-muted',
  nao_encontrado: 'text-destructive',
};

const TIPO_LABEL: Record<ImportBirthdayResultRow['tipo'], string> = {
  irmao: 'Irmão',
  conjuge: 'Cônjuge',
  filho: 'Filho(a)',
};

/**
 * Importação única (um clique, não repetível/agendada) dos aniversários de
 * Irmãos/cônjuges/filhos do relatório da GLEG — dataset já embutido em
 * `birthday-import-data.ts` (transcrito do PDF fornecido pelo
 * Administrador). Nunca sobrescreve dado já preenchido; o relatório de
 * resultado mostra o que foi atualizado e o que precisa de revisão manual
 * (sem cadastro correspondente por nome).
 */
export function ImportBirthdayDataPanel() {
  const [isRunning, startRunning] = useTransition();
  const [results, setResults] = useState<ImportBirthdayResultRow[] | null>(null);

  function handleRun() {
    startRunning(async () => {
      const outcome = await importBirthdayDataAction();
      setResults(outcome);
    });
  }

  const naoEncontrados = results?.filter((r) => r.status === 'nao_encontrado') ?? [];
  const atualizados = results?.filter((r) => r.status === 'atualizado') ?? [];
  const jaPreenchidos = results?.filter((r) => r.status === 'ja_preenchido') ?? [];

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Importar aniversários do relatório GLEG</p>
        <Button type="button" variant="outline" size="sm" onClick={handleRun} disabled={isRunning}>
          {isRunning ? 'Importando…' : 'Importar'}
        </Button>
      </div>
      <p className="text-muted text-xs">
        Vincula pelo nome ao cadastro já existente: data de nascimento do Irmão (calculada a partir
        de dia/mês/idade do relatório), aniversário da cônjuge e dos filhos (só dia/mês — o
        relatório de origem não traz o ano deles). Nunca sobrescreve um dado já preenchido.
      </p>

      {results && (
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-muted text-xs">
            {atualizados.length} atualizado(s) · {jaPreenchidos.length} já preenchido(s) ·{' '}
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
                    <span>
                      [{TIPO_LABEL[row.tipo]}] {row.nome}
                      {row.tipo !== 'irmao' && ` — Irmão "${row.irmaoBusca}"`}
                    </span>
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
                      [{TIPO_LABEL[row.tipo]}] {row.nome}
                      {row.tipo !== 'irmao' && ` — Irmão "${row.irmaoBusca}"`}
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
