'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button, Textarea } from '@vl6/ui';
import { importNewsFromUrlAction, type ImportNewsResult } from '../actions/content-actions';

/**
 * Importa notícias já publicadas em vl6.com.br como rascunho — cola um ou
 * mais links (um por linha), busca cada página no servidor e cria uma
 * notícia com o que o Open Graph do site expõe (título/resumo/capa). Uma
 * chamada de Server Action por link (mesmo padrão de fila tolerante a
 * falha parcial de `UploadStep`), sequencial e não paralela — é um fluxo
 * do Administrador, sem pressa, e evita martelar o site de origem.
 */
export function ImportNewsPanel() {
  const [open, setOpen] = useState(false);
  const [urlsText, setUrlsText] = useState('');
  const [isImporting, startImporting] = useTransition();
  const [results, setResults] = useState<ImportNewsResult[]>([]);

  function handleImport() {
    const urls = [
      ...new Set(
        urlsText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      ),
    ];
    if (urls.length === 0) return;

    setResults([]);
    startImporting(async () => {
      for (const url of urls) {
        const result = await importNewsFromUrlAction(url);
        setResults((prev) => [...prev, result]);
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Importar do site VL6
      </Button>
    );
  }

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Importar do site VL6</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted text-xs hover:underline"
        >
          Fechar
        </button>
      </div>
      <p className="text-muted text-xs">
        Cole abaixo o link de cada notícia em{' '}
        <a
          href="https://www.vl6.com.br/noticias"
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          vl6.com.br/noticias
        </a>{' '}
        que você quer trazer pra cá — um link por linha. Cada uma entra como rascunho com título,
        resumo e capa lidos da página; revise e complete o texto antes de publicar.
      </p>
      <Textarea
        rows={4}
        placeholder={'https://www.vl6.com.br/post/...\nhttps://www.vl6.com.br/post/...'}
        value={urlsText}
        onChange={(e) => setUrlsText(e.target.value)}
        disabled={isImporting}
      />
      <Button type="button" onClick={handleImport} disabled={isImporting} className="w-fit">
        {isImporting ? 'Importando…' : 'Importar'}
      </Button>

      {results.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {results.map((result, index) => (
            <li key={`${result.url}-${index}`} className="flex items-start gap-2">
              <span className={result.ok ? 'text-emerald-600' : 'text-destructive'}>
                {result.ok ? '✓' : '✗'}
              </span>
              {result.ok ? (
                <span>
                  <Link
                    href={`/admin/conteudo/noticias/${result.newsId}`}
                    className="hover:underline"
                  >
                    {result.titulo}
                  </Link>{' '}
                  <span className="text-muted text-xs">— importada como rascunho</span>
                </span>
              ) : (
                <span className="text-muted">
                  {result.url}: {result.error}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
