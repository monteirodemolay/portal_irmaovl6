'use client';

import { useState, useTransition } from 'react';
import { Button, Input } from '@vl6/ui';
import { scanPostImagesAction } from '../../actions/publish-hub-actions';

/**
 * "Importar de URL" — cola o link de um post já publicado (pensado pro
 * vl6.com.br), busca as imagens embutidas na página e deixa escolher
 * quais entram no lote. Só faz a busca/seleção aqui; quem efetivamente
 * importa (mesma fila de envio dos arquivos soltos) é o componente pai.
 */
export function ImportFromUrlPanel({ onImportUrls }: { onImportUrls: (urls: string[]) => void }) {
  const [pageUrl, setPageUrl] = useState('');
  const [isScanning, startScan] = useTransition();
  const [images, setImages] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function handleScan() {
    if (!pageUrl.trim()) return;
    setError(null);
    setImages(null);
    startScan(async () => {
      const result = await scanPostImagesAction(pageUrl.trim());
      if (!result.ok) {
        setError(result.error ?? 'Não foi possível analisar esse link.');
        return;
      }
      setImages(result.images);
      setSelected(new Set(result.images));
    });
  }

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function handleImport() {
    onImportUrls([...selected]);
    setImages(null);
    setSelected(new Set());
    setPageUrl('');
  }

  return (
    <div className="border-border mt-4 flex flex-col gap-3 rounded-lg border border-dashed p-4">
      <p className="text-sm font-medium">Importar fotos de um link já publicado</p>
      <p className="text-muted text-xs">
        Cole o link de um post do vl6.com.br — buscamos as fotos que já estão lá e você escolhe
        quais entram neste evento.
      </p>
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="https://www.vl6.com.br/post/..."
          value={pageUrl}
          onChange={(e) => setPageUrl(e.target.value)}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={handleScan} disabled={isScanning}>
          {isScanning ? 'Buscando…' : 'Buscar fotos'}
        </Button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}

      {images && images.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {images.map((url) => {
              const isSelected = selected.has(url);
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => toggle(url)}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                    isSelected ? 'border-accent' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {isSelected && (
                    <span className="bg-accent absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs text-white">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            onClick={handleImport}
            disabled={selected.size === 0}
            className="w-fit"
          >
            Importar {selected.size} foto{selected.size === 1 ? '' : 's'} selecionada
            {selected.size === 1 ? '' : 's'}
          </Button>
        </div>
      )}
    </div>
  );
}
