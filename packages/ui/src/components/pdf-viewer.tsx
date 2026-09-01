'use client';

import * as React from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { cn } from '../lib/cn';
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus } from '../icons';

// Servido como asset estático em apps/web/public/pdf.worker.min.mjs (cópia
// do arquivo de mesmo nome em node_modules/pdfjs-dist/build, versão pinada
// em apps/web/package.json). Evita por completo o import do worker via
// especificador de módulo: o Next.js trata `pdfjs-dist` como pacote ESM
// externo e a resolução de tipos de um sufixo `?url` (asset module do
// webpack) se mostrou inconsistente entre ambiente local e o build limpo
// do Vercel — um caminho de asset estático simples não depende de nenhum
// dos dois.
const PDF_WORKER_URL = '/pdf.worker.min.mjs';

export interface PdfViewerProps {
  src: string;
  title: string;
  className?: string;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.25;

/**
 * Prévia em tela de um PDF renderizada com `pdfjs-dist` direto em
 * `<canvas>` — nunca o `<iframe>`/plugin nativo do navegador (visual
 * inconsistente com o resto do site, cada navegador mostra um controle
 * diferente). Roda só no browser (`useEffect`, import dinâmico): as
 * armadilhas conhecidas de `pdfjs-dist` neste repo
 * (`apps/web/src/lib/pdf/ensure-node-dom-polyfills.ts`) são todas do lado
 * servidor/Node — em runtime de navegador `DOMMatrix`/canvas já existem
 * nativamente, sem nenhum dos dois problemas.
 */
export function PdfViewer({ src, title, className }: PdfViewerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const docRef = React.useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = React.useRef<{ cancel: () => void } | null>(null);

  const [pageCount, setPageCount] = React.useState(0);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [scale, setScale] = React.useState(1);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');

  // Carrega o documento uma vez por `src`.
  React.useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setPageNumber(1);
    setScale(1);

    import('pdfjs-dist').then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

      pdfjsLib
        .getDocument(src)
        .promise.then((doc) => {
          if (cancelled) return;
          docRef.current = doc;
          setPageCount(doc.numPages);
          setStatus('ready');
        })
        .catch(() => {
          if (!cancelled) setStatus('error');
        });
    });

    return () => {
      cancelled = true;
      docRef.current?.destroy();
      docRef.current = null;
    };
  }, [src]);

  // Renderiza a página atual (ou re-renderiza no zoom) sempre que pronto.
  React.useEffect(() => {
    if (status !== 'ready' || !docRef.current || !canvasRef.current) return;
    let cancelled = false;

    docRef.current.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      const baseViewport = page.getViewport({ scale: 1 });
      const fitScale = containerWidth > 0 ? containerWidth / baseViewport.width : 1;
      const viewport = page.getViewport({ scale: fitScale * scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      renderTaskRef.current?.cancel();
      const task = page.render({ canvas, canvasContext: context, viewport });
      renderTaskRef.current = task;
      task.promise.catch(() => {
        /* cancelamento de render anterior — esperado ao trocar de página/zoom rápido */
      });
    });

    return () => {
      cancelled = true;
    };
  }, [status, pageNumber, scale]);

  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <div
        ref={containerRef}
        className="border-border bg-background relative flex flex-1 items-center justify-center overflow-auto rounded-lg border"
      >
        {status === 'loading' && (
          <Loader2 size={28} className="text-muted animate-spin" strokeWidth={1.75} />
        )}
        {status === 'error' && (
          <p className="text-muted max-w-xs px-6 text-center text-sm">
            Não foi possível carregar a prévia deste PDF. Use &quot;Abrir em nova aba&quot; ou
            &quot;Baixar&quot;.
          </p>
        )}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={title}
          className={status === 'ready' ? 'block' : 'hidden'}
        />
      </div>

      {status === 'ready' && pageCount > 0 && (
        <div className="flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Diminuir zoom"
              disabled={scale <= MIN_SCALE}
              onClick={() => setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-40"
            >
              <Minus size={16} />
            </button>
            <span className="w-12 text-center text-xs tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              aria-label="Aumentar zoom"
              disabled={scale >= MAX_SCALE}
              onClick={() => setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Página anterior"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-40"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="min-w-[64px] text-center text-xs tabular-nums">
                {pageNumber} / {pageCount}
              </span>
              <button
                type="button"
                aria-label="Próxima página"
                disabled={pageNumber >= pageCount}
                onClick={() => setPageNumber((p) => Math.min(pageCount, p + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-40"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
