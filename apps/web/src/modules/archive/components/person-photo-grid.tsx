'use client';

import * as React from 'react';
import { PhotoGallery, type MediaViewerItem } from '@vl6/ui';

export interface PersonPhoto {
  id: string;
  eventId: string;
  src: string;
  caption: string;
}

/**
 * Fotografias da página de pessoa no Acervo — mesma galeria do álbum de
 * evento (`PhotoGallery`: foto grande, miniaturas, troca automática). Como
 * as fotos vêm de eventos diferentes, o visualizador em tela cheia mantém o
 * link "Abrir em nova aba" pro álbum do evento daquela foto
 * (`externalHref`), nunca perdendo o contexto.
 */
export function PersonPhotoGrid({ photos }: { photos: PersonPhoto[] }) {
  const items = React.useMemo<MediaViewerItem[]>(
    () =>
      photos.map((photo) => ({
        kind: 'imagem',
        src: photo.src,
        title: photo.caption,
        caption: photo.caption,
        externalHref: `/acervo/eventos/${photo.eventId}`,
      })),
    [photos],
  );

  if (photos.length === 0) return null;

  return <PhotoGallery photos={items} className="mt-4" />;
}
