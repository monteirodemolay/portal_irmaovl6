'use client';

import { useState } from 'react';
import { MediaViewerModal, type MediaViewerItem } from '@vl6/ui';

export interface PersonPhoto {
  id: string;
  eventId: string;
  src: string;
  caption: string;
}

/**
 * Grade de fotografias da página de pessoa no Acervo (Fase 0.5 — Visualizador
 * Unificado de Mídia). Antes, clicar numa miniatura pulava direto pro álbum
 * inteiro do evento — a foto específica se perdia no meio de outras dezenas.
 * Agora abre no `MediaViewerModal` já naquela foto, com "Ver álbum do
 * evento" como link pra quem quiser o contexto completo (nunca perde a
 * navegação anterior, só deixa de ser a única opção).
 */
export function PersonPhotoGrid({ photos }: { photos: PersonPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const viewerItems: MediaViewerItem[] = photos.map((photo) => ({
    kind: 'imagem',
    src: photo.src,
    title: photo.caption,
    caption: photo.caption,
    externalHref: `/acervo/eventos/${photo.eventId}`,
  }));

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            aria-label={photo.caption}
            className="border-border hover:border-accent focus-visible:ring-accent aspect-square overflow-hidden rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2"
          >
            <img
              src={photo.src}
              alt={photo.caption}
              loading="lazy"
              className="h-full w-full object-cover"
            />
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
