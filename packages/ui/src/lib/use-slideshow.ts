import * as React from 'react';

/** Tempo de cada foto no modo automático (apresentação de slides). */
export const SLIDESHOW_INTERVAL_MS = 4500;

const SWIPE_THRESHOLD_PX = 40;

/** Quem pediu "reduzir movimento" no sistema não recebe troca automática por padrão. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Chama `onAdvance` depois de `intervalMs` enquanto `enabled`. O timer
 * recomeça a cada mudança de `resetKey` (o índice atual) — assim clicar
 * numa seta ou miniatura dá o tempo cheio pra nova foto em vez de pular
 * logo em seguida.
 */
export function useAutoAdvance({
  enabled,
  resetKey,
  onAdvance,
  intervalMs = SLIDESHOW_INTERVAL_MS,
}: {
  enabled: boolean;
  resetKey: unknown;
  onAdvance: () => void;
  intervalMs?: number;
}) {
  const advanceRef = React.useRef(onAdvance);
  React.useEffect(() => {
    advanceRef.current = onAdvance;
  }, [onAdvance]);

  React.useEffect(() => {
    if (!enabled) return;
    const id = window.setTimeout(() => advanceRef.current(), intervalMs);
    return () => window.clearTimeout(id);
  }, [enabled, resetKey, intervalMs]);
}

/** Gesto de deslizar no touch (esquerda → próxima, direita → anterior), sem dependência nova. */
export function useSwipe(onPrev: () => void, onNext: () => void) {
  const startX = React.useRef<number | null>(null);

  const onTouchStart = React.useCallback((event: React.TouchEvent) => {
    startX.current = event.touches[0]?.clientX ?? null;
  }, []);

  const onTouchEnd = React.useCallback(
    (event: React.TouchEvent) => {
      if (startX.current === null) return;
      const delta = (event.changedTouches[0]?.clientX ?? startX.current) - startX.current;
      startX.current = null;
      if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
      if (delta > 0) onPrev();
      else onNext();
    },
    [onPrev, onNext],
  );

  return { onTouchStart, onTouchEnd };
}

/** Pré-carrega a próxima imagem pra troca (manual ou automática) não mostrar "piscada" de carregamento. */
export function usePreloadImage(src: string | null | undefined) {
  React.useEffect(() => {
    if (!src || typeof Image === 'undefined') return;
    const image = new Image();
    image.src = src;
  }, [src]);
}
