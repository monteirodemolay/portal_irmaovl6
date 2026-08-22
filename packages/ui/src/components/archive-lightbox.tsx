'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { ChevronLeft, ChevronRight, Download, X } from '../icons';

export interface ArchiveLightboxPhoto {
  src: string;
  alt: string;
  caption?: string | null;
  downloadHref?: string | null;
  downloadName?: string;
}

export interface ArchiveLightboxProps {
  photos: ArchiveLightboxPhoto[];
  /** Índice inicial dentro de `photos`. */
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const SWIPE_THRESHOLD_PX = 40;

/**
 * Visualizador em tela cheia das fotografias do álbum de um evento
 * (`/acervo/eventos/[eventId]`, Fase 4 da experiência pública). Componente
 * de apresentação puro (mesmo padrão de `VideoPlayer`/`PdfViewer`): não
 * conhece `ArchiveMedia`, só a lista de fotos já resolvida pelo chamador
 * (sempre via proxy autenticado, nunca a URL crua do Vercel Blob).
 *
 * Navegação: teclado (`ArrowLeft`/`ArrowRight`/`Escape`), clique nas setas,
 * e gesto de deslizar no touch (`onTouchStart`/`onTouchEnd`, sem
 * dependência nova). Foco preso no diálogo enquanto aberto.
 */
export function ArchiveLightbox({ photos, index, onIndexChange, onClose }: ArchiveLightboxProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const touchStartX = React.useRef<number | null>(null);
  const total = photos.length;
  const current = photos[index];

  const goTo = React.useCallback(
    (next: number) => {
      if (total === 0) return;
      onIndexChange(((next % total) + total) % total);
    },
    [onIndexChange, total],
  );
  const goPrev = React.useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = React.useCallback(() => goTo(index + 1), [goTo, index]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') goPrev();
      else if (event.key === 'ArrowRight') goNext();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, goPrev, goNext]);

  React.useEffect(() => {
    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!current) return null;

  function onTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta > 0) goPrev();
    else goNext();
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={current.caption ? current.caption : `Fotografia ${index + 1} de ${total}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 outline-none"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 p-3 text-white sm:p-4">
        <span className="text-xs font-medium tabular-nums opacity-80 sm:text-sm">
          {index + 1} / {total}
        </span>
        <div className="flex items-center gap-2">
          {current.downloadHref && (
            <a
              href={current.downloadHref}
              download={current.downloadName}
              aria-label="Baixar fotografia"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              onClick={(event) => event.stopPropagation()}
            >
              <Download size={18} />
            </a>
          )}
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-4">
        {total > 1 && (
          <button
            type="button"
            aria-label="Fotografia anterior"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            className="absolute left-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <img
          src={current.src}
          alt={current.alt}
          className={cn('max-h-full max-w-full select-none object-contain')}
          draggable={false}
        />

        {total > 1 && (
          <button
            type="button"
            aria-label="Próxima fotografia"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            className="absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-4"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {current.caption && (
        <p className="shrink-0 px-4 pb-4 pt-2 text-center text-sm text-white/85 sm:pb-6">
          {current.caption}
        </p>
      )}
    </div>
  );
}
