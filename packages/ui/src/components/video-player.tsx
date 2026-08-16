import * as React from 'react';
import { cn } from '../lib/cn';

export interface VideoPlayerProps {
  src: string;
  title: string;
  posterUrl?: string | null;
  className?: string;
}

/**
 * Player de vídeo do Acervo VL6 — `<video>` nativo com controles do
 * navegador (nenhuma dependência nova). `src` deve sempre vir de um proxy
 * autenticado (nunca a URL crua do Vercel Blob). Legendas/transcrição ainda
 * não existem no modelo de dados (Etapa 4 futura) — não simuladas aqui.
 */
export function VideoPlayer({ src, title, posterUrl, className }: VideoPlayerProps) {
  return (
    <video
      src={src}
      controls
      poster={posterUrl ?? undefined}
      aria-label={title}
      className={cn('border-border w-full rounded-lg border bg-black', className)}
    >
      Seu navegador não suporta reprodução de vídeo.
    </video>
  );
}
