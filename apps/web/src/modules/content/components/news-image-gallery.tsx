'use client';

import * as React from 'react';
import { PhotoGallery, type MediaViewerItem } from '@vl6/ui';

export interface NewsImageGalleryProps {
  images: string[];
  title: string;
}

/**
 * Fotos de uma notícia (`/noticias/[slug]`) — mesma galeria do Acervo VL6
 * (`PhotoGallery`: foto grande, miniaturas, troca automática, tela cheia).
 */
export function NewsImageGallery({ images, title }: NewsImageGalleryProps) {
  const photos = React.useMemo<MediaViewerItem[]>(
    () =>
      images.map((url, index) => ({
        kind: 'imagem',
        src: url,
        title: `Foto ${index + 1} de ${title}`,
      })),
    [images, title],
  );

  if (images.length === 0) return null;

  return (
    <section className="mx-auto mt-10 max-w-5xl">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-accent text-xs font-semibold uppercase tracking-[0.18em]">Galeria</p>
          <h2 className="font-display mt-1 text-2xl font-semibold">Fotos da notícia</h2>
        </div>
        <span className="text-muted text-xs">
          {images.length} {images.length === 1 ? 'imagem' : 'imagens'}
        </span>
      </div>

      <PhotoGallery photos={photos} />
    </section>
  );
}
