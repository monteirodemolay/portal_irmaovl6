'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn } from '../icons';
import {
  prefersReducedMotion,
  useAutoAdvance,
  usePreloadImage,
  useSwipe,
} from '../lib/use-slideshow';
import { MediaViewerModal, type MediaViewerItem } from './media-viewer-modal';
import { PlayPauseButton, PositionBar, ThumbButton } from './slideshow-parts';

export interface PhotoGalleryProps {
  /** Fotografias já resolvidas pelo chamador (sempre via proxy autenticado). */
  photos: MediaViewerItem[];
  /** Controle opcional do índice (pra manter sincronia entre abas); sem ele o componente guarda o próprio. */
  index?: number;
  onIndexChange?: (index: number) => void;
  /** Troca automática de foto — ligada por padrão, exceto com "reduzir movimento" no sistema. */
  autoPlay?: boolean;
  className?: string;
}

/**
 * Galeria de fotografias do Acervo VL6: foto grande com setas, contador
 * "9 / 14", barra de posição e grade de miniaturas embaixo. Troca de foto
 * sozinha (pausa com o mouse em cima ou no botão play/pause), aceita
 * deslizar no celular e setas do teclado. Clicar na foto grande (ou em
 * "Clique para ampliar") abre o `MediaViewerModal` em tela cheia já nela.
 *
 * Componente de apresentação puro — mesmo padrão de `MediaViewerModal`.
 */
export function PhotoGallery({
  photos,
  index: controlledIndex,
  onIndexChange,
  autoPlay = true,
  className,
}: PhotoGalleryProps) {
  const [innerIndex, setInnerIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(() => autoPlay && !prefersReducedMotion());
  const [hovering, setHovering] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const total = photos.length;
  const rawIndex = controlledIndex ?? innerIndex;
  const index = total > 0 ? Math.min(Math.max(rawIndex, 0), total - 1) : 0;
  const current = photos[index];

  const setIndex = React.useCallback(
    (next: number) => {
      if (total === 0) return;
      const wrapped = ((next % total) + total) % total;
      setInnerIndex(wrapped);
      onIndexChange?.(wrapped);
    },
    [onIndexChange, total],
  );
  const goPrev = React.useCallback(() => setIndex(index - 1), [setIndex, index]);
  const goNext = React.useCallback(() => setIndex(index + 1), [setIndex, index]);
  const swipe = useSwipe(goPrev, goNext);

  // Com a tela cheia aberta, quem troca de foto é o visualizador — a galeria de trás espera.
  useAutoAdvance({
    enabled: playing && !hovering && !expanded && total > 1,
    resetKey: index,
    onAdvance: goNext,
  });
  const nextPhoto = total > 1 ? photos[(index + 1) % total] : undefined;
  usePreloadImage(nextPhoto?.src);

  if (!current) return null;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-[#D4AF37]/25 bg-[#14110d] p-2 sm:gap-4 sm:p-4',
        className,
      )}
    >
      <div
        role="group"
        aria-roledescription="carrossel"
        aria-label={`Galeria de fotografias, ${index + 1} de ${total}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') goPrev();
          else if (event.key === 'ArrowRight') goNext();
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
        className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#D4AF37]/40 bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] sm:aspect-[16/10]"
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={`Ampliar: ${current.title}`}
          className="absolute inset-0 flex cursor-zoom-in items-center justify-center"
        >
          <img
            key={index}
            src={current.src}
            alt={current.title}
            draggable={false}
            className="animate-in fade-in h-full w-full select-none object-contain duration-500"
          />
        </button>

        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Fotografia anterior"
              onClick={goPrev}
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-[#26221d]/85 text-white backdrop-blur transition-colors hover:bg-[#D4AF37] hover:text-black sm:left-4"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              aria-label="Próxima fotografia"
              onClick={goNext}
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-[#26221d]/85 text-white backdrop-blur transition-colors hover:bg-[#D4AF37] hover:text-black sm:right-4"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        <div className="absolute right-2 top-2 flex items-center gap-2 sm:right-3 sm:top-3">
          {total > 1 && (
            <PlayPauseButton
              playing={playing}
              onToggle={() => setPlaying((value) => !value)}
              className="bg-[#26221d]/85 backdrop-blur"
            />
          )}
          <button
            type="button"
            aria-label="Tela cheia"
            onClick={() => setExpanded(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#26221d]/85 text-white backdrop-blur transition-colors hover:bg-[#D4AF37] hover:text-black"
          >
            <Maximize2 size={17} />
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 text-white sm:inset-x-3 sm:bottom-3">
          <span className="flex items-center gap-1.5 rounded-full bg-[#26221d]/85 px-3 py-1.5 text-xs font-medium backdrop-blur sm:text-sm">
            <ZoomIn size={15} className="text-[#D4AF37]" />
            Clique para ampliar
          </span>
          <span className="rounded-full bg-[#26221d]/85 px-3 py-1.5 text-xs font-medium tabular-nums backdrop-blur sm:text-sm">
            {index + 1} / {total}
          </span>
        </div>
      </div>

      {current.caption && <p className="text-sm text-white/80">{current.caption}</p>}

      {total > 1 && (
        <>
          <PositionBar index={index} total={total} />
          <div
            className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5"
            role="group"
            aria-label="Miniaturas da galeria"
          >
            {photos.map((photo, photoIndex) => (
              <ThumbButton
                key={`${photoIndex}-${photo.src}`}
                item={photo}
                position={photoIndex}
                active={photoIndex === index}
                onSelect={() => setIndex(photoIndex)}
                className="aspect-[4/3] w-full"
              />
            ))}
          </div>
        </>
      )}

      {expanded && (
        <MediaViewerModal
          items={photos}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setExpanded(false)}
          autoPlay={playing}
        />
      )}
    </div>
  );
}
