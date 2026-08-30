'use client';

import { useState } from 'react';
import { MediaViewerModal, type MediaViewerItem } from '@vl6/ui';

export interface MemberPhoto {
  id: string;
  src: string;
  caption: string;
}

/**
 * Grade de "Memória fotográfica" no perfil público do Diretório (Fase B —
 * ponte Diretório → Acervo). Mesmo padrão de `PersonPhotoGrid` do Acervo,
 * mas sem o link "Ver álbum do evento": o Diretório é lido por qualquer
 * Irmão com `memberDirectory:read`, nem sempre com acesso ao Acervo VL6.
 */
export function MemberPhotoGrid({ photos }: { photos: MemberPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const viewerItems: MediaViewerItem[] = photos.map((photo) => ({
    kind: 'imagem',
    src: photo.src,
    title: photo.caption,
    caption: photo.caption,
  }));

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
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
