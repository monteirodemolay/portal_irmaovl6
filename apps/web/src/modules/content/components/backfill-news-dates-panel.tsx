'use client';

import { useState, useTransition } from 'react';
import { Button } from '@vl6/ui';
import {
  backfillNewsPublishedDatesAction,
  type BackfillNewsPublishedDateResult,
} from '../actions/content-actions';

function formatDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat('pt-BR').format(new Date(date)) : '—';
}

/**
 * Corrige a `dataPublicacao` de notícias importadas do site VL6 antes desse
 * campo existir — um clique único, não pensado pra rodar toda hora (mesmo
 * espírito do `ImportNewsPanel`, sem fila/agendamento).
 */
export function BackfillNewsDatesPanel() {
  const [isRunning, startRunning] = useTransition();
  const [results, setResults] = useState<BackfillNewsPublishedDateResult[] | null>(null);

  function handleRun() {
    startRunning(async () => {
      const outcome = await backfillNewsPublishedDatesAction();
      setResults(outcome);
    });
  }

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Corrigir datas de notícias importadas</p>
        <Button type="button" variant="outline" size="sm" onClick={handleRun} disabled={isRunning}>
          {isRunning ? 'Verificando…' : 'Verificar e corrigir'}
        </Button>
      </div>
      <p className="text-muted text-xs">
        Refaz a busca da data original no site VL6 para cada notícia importada e corrige a "Data de
        publicação" aqui no Portal quando ela ainda estiver com a data da importação em vez da data
        real de veiculação.
      </p>

      {results && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {results.length === 0 ? (
            <li className="text-muted text-xs">Nenhuma notícia importada precisava de correção.</li>
          ) : (
            results.map((result) => (
              <li key={result.newsId} className="flex items-start gap-2">
                <span className={result.ok ? 'text-emerald-600' : 'text-destructive'}>
                  {result.ok ? '✓' : '✗'}
                </span>
                <span>
                  {result.titulo}{' '}
                  {result.ok ? (
                    <span className="text-muted text-xs">
                      — {formatDate(result.dataAnterior)} → {formatDate(result.dataNova)}
                    </span>
                  ) : (
                    <span className="text-muted text-xs">— {result.error}</span>
                  )}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
