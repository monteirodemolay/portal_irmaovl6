'use client';

import { useRef, useState, useTransition } from 'react';
import { Move } from '@vl6/ui';

export interface CoverPositionPickerProps {
  src: string;
  alt: string;
  /** Ponto focal atual (0-100) — `null` equivale ao centro (50, 50). */
  focalX: number | null;
  focalY: number | null;
  onSave: (focalX: number, focalY: number) => Promise<void>;
  className?: string;
}

/**
 * Ajuste de recorte de uma foto exibida em `object-cover` — arraste (ou
 * clique) sobre a própria imagem pra mover o ponto focal, salva ao soltar.
 * Reaproveitado tanto na Central de Publicação (Revisão, antes de
 * publicar) quanto na página pública do evento já publicado (admin com
 * `archiveMedia:update`) — mesmo componente, dois contextos, porque o
 * problema ("o recorte automático corta o que importa da foto") é o
 * mesmo nos dois lugares.
 */
export function CoverPositionPicker({
  src,
  alt,
  focalX,
  focalY,
  onSave,
  className = 'h-44',
}: CoverPositionPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: focalX ?? 50, y: focalY ?? 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();

  function positionFromPointer(clientX: number, clientY: number): { x: number; y: number } {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x), y: Math.round(y) };
  }

  function commit(next: { x: number; y: number }) {
    setPosition(next);
    startTransition(async () => {
      await onSave(next.x, next.y);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className={`relative w-full cursor-move touch-none select-none overflow-hidden rounded-lg ${className}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setIsDragging(true);
          setPosition(positionFromPointer(event.clientX, event.clientY));
        }}
        onPointerMove={(event) => {
          if (!isDragging) return;
          setPosition(positionFromPointer(event.clientX, event.clientY));
        }}
        onPointerUp={(event) => {
          setIsDragging(false);
          commit(positionFromPointer(event.clientX, event.clientY));
        }}
      >
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          style={{ objectPosition: `${position.x}% ${position.y}%` }}
          draggable={false}
        />
        <span
          className="border-accent bg-accent/30 pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-md"
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
        />
      </div>
      <div className="text-muted flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5">
          <Move size={13} />
          {isPending ? 'Salvando posição…' : 'Arraste a foto pra ajustar o recorte'}
        </span>
        {(position.x !== 50 || position.y !== 50) && (
          <button
            type="button"
            className="text-accent font-medium hover:underline"
            onClick={() => commit({ x: 50, y: 50 })}
          >
            Centralizar
          </button>
        )}
      </div>
    </div>
  );
}
