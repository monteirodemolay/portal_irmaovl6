'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { FileText, Pause, Play } from '../icons';

/** Mínimo que as peças de apresentação precisam saber de cada item da galeria. */
export interface SlideshowThumbItem {
  kind: 'imagem' | 'video' | 'pdf' | 'outro';
  src: string;
  title: string;
  posterUrl?: string | null;
}

/** Botão redondo "tocar/pausar" da troca automática de fotos. */
export function PlayPauseButton({
  playing,
  onToggle,
  className,
}: {
  playing: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={playing ? 'Pausar apresentação' : 'Iniciar apresentação'}
      aria-pressed={playing}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20',
        className,
      )}
    >
      {playing ? <Pause size={17} /> : <Play size={17} />}
    </button>
  );
}

/** Barra fina de posição (foto atual / total), como no exemplo de referência. */
export function PositionBar({
  index,
  total,
  className,
}: {
  index: number;
  total: number;
  className?: string;
}) {
  const percent = total > 0 ? ((index + 1) / total) * 100 : 0;
  return (
    <div
      role="progressbar"
      aria-label="Posição na galeria"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={index + 1}
      className={cn('h-1 w-full overflow-hidden rounded-full bg-white/15', className)}
    >
      <div
        className="bg-accent h-full rounded-full transition-[width] duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** Miniatura clicável; a ativa ganha anel de destaque e `aria-current`. */
export function ThumbButton({
  item,
  position,
  active,
  onSelect,
  scrollIntoViewWhenActive = false,
  className,
}: {
  item: SlideshowThumbItem;
  position: number;
  active: boolean;
  onSelect: () => void;
  /** Só pra faixas rolláveis (modal): centraliza a ativa. Na grade da página isso rolaria a página inteira. */
  scrollIntoViewWhenActive?: boolean;
  className?: string;
}) {
  const ref = React.useRef<HTMLButtonElement>(null);

  // Mantém a miniatura ativa visível quando a troca é automática ou por seta.
  React.useEffect(() => {
    if (active && scrollIntoViewWhenActive)
      ref.current?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [active, scrollIntoViewWhenActive]);

  const thumbSrc = item.kind === 'imagem' ? item.src : item.posterUrl;

  return (
    <button
      ref={ref}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      aria-label={`Ver item ${position + 1}: ${item.title}`}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'focus-visible:ring-accent relative overflow-hidden rounded-lg border-2 bg-black/40 transition focus-visible:outline-none focus-visible:ring-2',
        active ? 'border-accent opacity-100' : 'border-transparent opacity-60 hover:opacity-100',
        className,
      )}
    >
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt=""
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-white/70">
          {item.kind === 'video' ? <Play size={20} /> : <FileText size={20} />}
        </span>
      )}
    </button>
  );
}
