'use client';

import { useState } from 'react';
import type { GalleryMedia } from '@vl6/domain';
import { MediaViewerModal, Play, type MediaViewerItem } from '@vl6/ui';

/**
 * Grade da Galeria legada (`/galeria/[albumId]`) — mesmo tratamento visual
 * já dado ao Acervo VL6 (Fase 0, Visualizador Unificado de Mídia): clicar
 * abre o `MediaViewerModal` ali mesmo (fundo escurecido, prévia em tela),
 * nunca mais `<a target="_blank">` saindo pro binário cru.
 */
export function GalleryAlbumGrid({
  media,
  albumTitulo,
}: {
  media: GalleryMedia[];
  albumTitulo: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const viewerItems: MediaViewerItem[] = media.map((item) => ({
    kind: item.tipo === 'foto' ? 'imagem' : 'video',
    src: `/api/gallery-media/${item.id}`,
    title: albumTitulo,
  }));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {media.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            aria-label={item.tipo === 'video' ? 'Abrir vídeo' : 'Abrir fotografia'}
            className="border-border hover:border-accent focus-visible:ring-accent group relative aspect-square overflow-hidden rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            {item.urlMiniatura || item.tipo === 'foto' ? (
              <img
                src={item.urlMiniatura ?? item.url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="bg-background flex h-full w-full items-center justify-center">
                <Play size={28} className="text-muted" strokeWidth={1.5} />
              </div>
            )}
            {item.tipo === 'video' && item.urlMiniatura && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                <Play size={28} className="text-white" strokeWidth={1.5} />
              </span>
            )}
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <MediaViewerModal
          items={viewerItems}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
