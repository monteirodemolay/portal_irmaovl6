'use client';

import * as React from 'react';
import type { GalleryMedia } from '@vl6/domain';
import { MediaViewerModal, PhotoGallery, Play, type MediaViewerItem } from '@vl6/ui';

/**
 * Álbum da Galeria legada (`/galeria/[albumId]`) — mesma galeria do Acervo
 * VL6: as fotografias entram na `PhotoGallery` (foto grande, miniaturas,
 * troca automática); os vídeos, que não têm "troca de slide", continuam em
 * grade própria e abrem no `MediaViewerModal`.
 */
export function GalleryAlbumGrid({
  media,
  albumTitulo,
}: {
  media: GalleryMedia[];
  albumTitulo: string;
}) {
  const [openVideoIndex, setOpenVideoIndex] = React.useState<number | null>(null);

  const photos = React.useMemo<MediaViewerItem[]>(
    () =>
      media
        .filter((item) => item.tipo === 'foto')
        .map((item, index) => ({
          kind: 'imagem',
          src: `/api/gallery-media/${item.id}`,
          title: `Fotografia ${index + 1} do álbum ${albumTitulo}`,
        })),
    [media, albumTitulo],
  );

  const videos = React.useMemo(() => media.filter((item) => item.tipo === 'video'), [media]);
  const videoItems = React.useMemo<MediaViewerItem[]>(
    () =>
      videos.map((item) => ({
        kind: 'video',
        src: `/api/gallery-media/${item.id}`,
        title: albumTitulo,
        posterUrl: item.urlMiniatura,
      })),
    [videos, albumTitulo],
  );

  return (
    <div className="flex flex-col gap-8">
      {photos.length > 0 && <PhotoGallery photos={photos} />}

      {videos.length > 0 && (
        <section aria-label="Vídeos">
          {photos.length > 0 && (
            <h2 className="text-muted mb-3 text-xs font-semibold uppercase tracking-wide">
              Vídeos
            </h2>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {videos.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpenVideoIndex(index)}
                aria-label="Abrir vídeo"
                className="border-border hover:border-accent focus-visible:ring-accent group relative aspect-square overflow-hidden rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2"
              >
                {item.urlMiniatura ? (
                  <img
                    src={item.urlMiniatura}
                    alt={`Vídeo ${index + 1} do álbum ${albumTitulo}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="bg-background flex h-full w-full items-center justify-center">
                    <Play size={28} className="text-muted" strokeWidth={1.5} />
                  </div>
                )}
                {item.urlMiniatura && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play size={28} className="text-white" strokeWidth={1.5} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {openVideoIndex !== null && (
        <MediaViewerModal
          items={videoItems}
          index={openVideoIndex}
          onIndexChange={setOpenVideoIndex}
          onClose={() => setOpenVideoIndex(null)}
          autoPlay={false}
        />
      )}
    </div>
  );
}
