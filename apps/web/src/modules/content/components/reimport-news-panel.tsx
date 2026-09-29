'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@vl6/ui';
import {
  reimportImportedNewsAction,
  type ReimportImportedNewsResult,
} from '../actions/content-actions';

export function ReimportNewsPanel() {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<ReimportImportedNewsResult[]>([]);
  const [done, setDone] = useState(false);

  function handleReimport() {
    setResults([]);
    setDone(false);

    startTransition(async () => {
      const response = await reimportImportedNewsAction();
      setResults(response);
      setDone(true);
    });
  }

  const successes = results.filter((item) => item.ok).length;
  const failures = results.filter((item) => !item.ok).length;

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Reimportar notícias já vinculadas ao site VL6</p>
        <p className="text-muted mt-1 text-xs leading-relaxed">
          Atualiza, em lote, as matérias que já possuem link de origem do vl6.com.br. Mantém slug,
          status de publicação, categoria e destaques, mas busca novamente título, subtítulo, capa,
          texto completo, imagens e data original. O link integral da fonte permanece no rodapé.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleReimport}
        disabled={isPending}
        className="w-fit"
      >
        {isPending ? 'Reimportando…' : 'Reimportar todas as notícias vinculadas'}
      </Button>

      {done && (
        <div className="text-sm">
          <p>
            Concluído: <strong>{successes}</strong> atualizada(s)
            {failures > 0 ? (
              <>
                {' '}
                e <strong>{failures}</strong> com falha.
              </>
            ) : (
              '.'
            )}
          </p>

          {results.length === 0 && (
            <p className="text-muted mt-1 text-xs">
              Nenhuma notícia com link de origem foi encontrada.
            </p>
          )}

          {failures > 0 && (
            <ul className="mt-2 flex flex-col gap-1.5 text-xs">
              {results
                .filter((item) => !item.ok)
                .map((item) => (
                  <li key={item.newsId} className="text-muted">
                    <Link
                      href={`/admin/conteudo/noticias/${item.newsId}`}
                      className="font-medium hover:underline"
                    >
                      {item.titulo}
                    </Link>
                    : {item.error}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
