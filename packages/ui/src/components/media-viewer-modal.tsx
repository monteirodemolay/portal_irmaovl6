'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, X } from '../icons';
import { VideoPlayer } from './video-player';
import { PdfViewer } from './pdf-viewer';

export type MediaViewerItemKind = 'imagem' | 'video' | 'pdf' | 'outro';

export interface MediaViewerItem {
  kind: MediaViewerItemKind;
  /** URL de exibição — sempre via proxy autenticado, nunca a URL crua do storage. Ignorado quando `kind === 'outro'`. */
  src: string;
  title: string;
  caption?: string | null;
  posterUrl?: string | null;
  downloadHref?: string | null;
  downloadName?: string;
  /** Link pra abrir a página completa do item (permalink) — sempre oferecido, mesmo quando há prévia em tela. */
  externalHref?: string | null;
  /** Pessoas identificadas neste item (fotografias do Acervo) — cada uma linka pra sua página de trajetória. */
  people?: { id: string; label: string; href: string }[];
}

export interface MediaViewerModalProps {
  items: MediaViewerItem[];
  /** Índice inicial dentro de `items`. */
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const SWIPE_THRESHOLD_PX = 40;

function MediaBody({ item }: { item: MediaViewerItem }) {
  if (item.kind === 'imagem') {
    return (
      <img
        src={item.src}
        alt={item.title}
        className="max-h-full max-w-full select-none object-contain"
        draggable={false}
      />
    );
  }
  if (item.kind === 'video') {
    return (
      <div className="w-full max-w-3xl px-2">
        <VideoPlayer src={item.src} title={item.title} posterUrl={item.posterUrl} />
      </div>
    );
  }
  if (item.kind === 'pdf') {
    return (
      <div className="flex h-full w-full max-w-4xl flex-col gap-2 px-2">
        <PdfViewer src={item.src} title={item.title} className="h-full" />
      </div>
    );
  }
  return (
    <div className="mx-4 flex flex-col items-center gap-3 rounded-lg bg-white/5 p-10 text-center">
      <FileText size={36} className="text-white/60" strokeWidth={1.5} />
      <p className="max-w-xs text-sm text-white/70">
        Prévia em tela não disponível para este tipo de arquivo.
      </p>
    </div>
  );
}

/**
 * Visualizador único pra qualquer mídia do Acervo VL6 — foto, vídeo, PDF ou
 * outro documento — evolução do antigo `ArchiveLightbox` (que só cobria
 * fotografias). Mesmo padrão de componente de apresentação puro: não
 * conhece `ArchiveMedia`/`FileAsset`, só a lista já resolvida pelo
 * chamador, sempre via proxy autenticado.
 *
 * Mesma navegação do `ArchiveLightbox` (teclado, clique nas setas, swipe em
 * touch), generalizada pra funcionar entre itens de tipos diferentes na
 * mesma coleção — abrir uma foto e passar pro próximo item mesmo que seja
 * um PDF, sem fechar e reabrir.
 */
export function MediaViewerModal({ items, index, onIndexChange, onClose }: MediaViewerModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const touchStartX = React.useRef<number | null>(null);
  const total = items.length;
  const current = items[index];

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
      aria-label={current.caption ? current.caption : `${current.title} — ${index + 1} de ${total}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 outline-none"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 p-3 text-white sm:p-4">
        <span className="min-w-0 truncate text-xs font-medium opacity-80 sm:text-sm">
          <span className="tabular-nums">
            {index + 1} / {total}
          </span>
          {total > 0 && <span className="ml-2 hidden sm:inline">{current.title}</span>}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {current.externalHref && (
            <a
              href={current.externalHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir em nova aba"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink size={17} />
            </a>
          )}
          {current.downloadHref && (
            <a
              href={current.downloadHref}
              download={current.downloadName}
              aria-label="Baixar"
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

      <div
        className={cn(
          'relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-4',
          current.kind === 'pdf' && 'py-2',
        )}
      >
        {total > 1 && (
          <button
            type="button"
            aria-label="Item anterior"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            className="absolute left-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <MediaBody item={current} />

        {total > 1 && (
          <button
            type="button"
            aria-label="Próximo item"
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

      {(current.caption || (current.people && current.people.length > 0)) && (
        <div className="shrink-0 px-4 pb-4 pt-2 text-center sm:pb-6">
          {current.caption && <p className="text-sm text-white/85">{current.caption}</p>}
          {current.people && current.people.length > 0 && (
            <p className="mt-1.5 text-xs text-white/70">
              Pessoas identificadas:{' '}
              {current.people.map((person, personIndex) => (
                <span key={person.id}>
                  <a
                    href={person.href}
                    className="underline decoration-white/40 hover:text-white hover:decoration-white"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {person.label}
                  </a>
                  {personIndex < current.people!.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
