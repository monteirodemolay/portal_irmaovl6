'use client';

import { useState, useTransition } from 'react';
import { Button } from '@vl6/ui';
import type { VerifyBirthdayMismatch } from '@vl6/domain';
import { verifyBirthdayDataAction } from '../actions/verify-birthday-data-action';

const TIPO_LABEL: Record<VerifyBirthdayMismatch['tipo'], string> = {
  irmao: 'Irmão',
  conjuge: 'Cônjuge',
  filho: 'Filho(a)',
};

function formatDiaMes(dia: number | null, mes: number | null): string {
  if (dia === null || mes === null) return '—';
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
}

/**
 * Confere dia/mês de nascimento já cadastrado contra o relatório GLEG
 * (mesma fonte de `ImportBirthdayDataPanel`) e corrige quem não bate —
 * diferente da importação, que só preenche em branco, este corrige até um
 * valor já preenchido só que errado. Ver `VerifyBirthdayDataUseCase`.
 */
export function VerifyBirthdayDataPanel() {
  const [isRunning, startRunning] = useTransition();
  const [results, setResults] = useState<VerifyBirthdayMismatch[] | null>(null);

  function handleRun() {
    startRunning(async () => {
      const outcome = await verifyBirthdayDataAction();
      setResults(outcome);
    });
  }

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Verificar e corrigir datas de aniversário</p>
        <Button type="button" variant="outline" size="sm" onClick={handleRun} disabled={isRunning}>
          {isRunning ? 'Verificando…' : 'Verificar'}
        </Button>
      </div>
      <p className="text-muted text-xs">
        Confere dia/mês já cadastrado (Irmão, cônjuge e filhos) contra o relatório GLEG e corrige
        quem estiver diferente — cobre datas erradas, não só datas em branco.
      </p>

      {results && (
        <div className="flex flex-col gap-2 text-sm">
          {results.length === 0 ? (
            <p className="text-muted text-xs">
              Nenhuma divergência encontrada — todas as datas conferidas batem com o relatório.
            </p>
          ) : (
            <>
              <p className="text-muted text-xs">{results.length} data(s) corrigida(s):</p>
              <ul className="flex flex-col gap-1">
                {results.map((row, index) => (
                  <li key={index} className="text-xs">
                    [{TIPO_LABEL[row.tipo]}] {row.nome}
                    {row.tipo !== 'irmao' && ` — Irmão "${row.irmaoNomeCompleto}"`}:{' '}
                    <span className="text-destructive">
                      {formatDiaMes(row.diaAtual, row.mesAtual)}
                    </span>{' '}
                    →{' '}
                    <span className="text-emerald-600">
                      {formatDiaMes(row.diaEsperado, row.mesEsperado)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
