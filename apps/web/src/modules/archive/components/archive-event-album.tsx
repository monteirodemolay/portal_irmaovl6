'use client';

import * as React from 'react';
import {
  ArchiveLightbox,
  Camera,
  Download,
  FileText,
  Music,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Video,
  VideoPlayer,
  type ArchiveLightboxPhoto,
} from '@vl6/ui';
import type { EventAlbumMediaItem } from '../lib/load-event-album';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/** `true` quando o navegador consegue exibir o documento embutido numa nova aba (imagem/PDF). */
function isPreviewableInline(mimeType: string): boolean {
  return mimeType === 'application/pdf' || mimeType.startsWith('image/');
}

function toLightboxPhoto(media: EventAlbumMediaItem): ArchiveLightboxPhoto {
  return {
    src: media.src,
    alt: media.altText ?? media.caption ?? media.originalName,
    caption: media.caption,
    downloadHref: media.allowDownload ? media.src : null,
    downloadName: media.originalName,
    people: media.pessoasIdentificadas.map((pessoa) => ({
      id: pessoa.id,
      label: pessoa.nomeCompleto,
      href: `/acervo/pessoas/${pessoa.id}`,
    })),
  };
}

function PhotoGrid({
  photos,
  onOpen,
}: {
  photos: EventAlbumMediaItem[];
  onOpen: (index: number) => void;
}) {
  if (photos.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
      {photos.map((photo, index) => (
        <button
          key={photo.id}
          type="button"
          onClick={() => onOpen(index)}
          aria-label={photo.caption ?? `Ampliar fotografia ${index + 1}`}
          className="border-border hover:border-accent focus-visible:ring-accent aspect-square overflow-hidden rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2"
        >
          <img
            src={photo.src}
            alt={photo.altText ?? photo.caption ?? photo.originalName}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </button>
      ))}
    </div>
  );
}

function VideoList({ videos }: { videos: EventAlbumMediaItem[] }) {
  if (videos.length === 0) return null;
  return (
    <div className="flex flex-col gap-6">
      {videos.map((video) => (
        <div key={video.id} className="flex flex-col gap-2">
          <VideoPlayer src={video.src} title={video.caption ?? video.originalName} />
          {video.caption && <p className="text-muted text-sm">{video.caption}</p>}
          {video.allowDownload && (
            <a
              href={video.src}
              download={video.originalName}
              className="text-accent inline-flex w-fit items-center gap-1.5 text-xs font-medium hover:underline"
            >
              <Download size={13} />
              Baixar vídeo
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function AudioList({ audios }: { audios: EventAlbumMediaItem[] }) {
  if (audios.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {audios.map((audio) => (
        <div key={audio.id} className="border-border rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Music size={16} className="text-accent shrink-0" />
            <p className="min-w-0 truncate text-sm font-medium">
              {audio.caption ?? audio.originalName}
            </p>
          </div>
          <audio src={audio.src} controls className="mt-3 w-full" />
          {audio.allowDownload && (
            <a
              href={audio.src}
              download={audio.originalName}
              className="text-accent mt-2 inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
            >
              <Download size={13} />
              Baixar áudio
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function DocumentList({ documents }: { documents: EventAlbumMediaItem[] }) {
  if (documents.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {documents.map((doc) => {
        const previewable = isPreviewableInline(doc.mimeType);
        const canOfferLink = doc.allowDownload || previewable;
        return (
          <li key={doc.id} className="border-border flex items-center gap-3 rounded-lg border p-3">
            <FileText size={18} className="text-accent shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{doc.caption ?? doc.originalName}</p>
              <p className="text-muted text-xs">{formatBytes(doc.sizeBytes)}</p>
            </div>
            {canOfferLink ? (
              <a
                href={doc.src}
                target="_blank"
                rel="noreferrer"
                download={doc.allowDownload ? doc.originalName : undefined}
                className="border-border hover:border-accent shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
              >
                {doc.allowDownload ? 'Baixar' : 'Visualizar'}
              </a>
            ) : (
              <span className="text-muted shrink-0 text-xs">Reservado</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Corpo em abas do álbum público de um evento (`/acervo/eventos/[eventId]`,
 * Fase 4 — experiência do Irmão, distinta da Central de Publicação
 * administrativa das Fases 2/3). Só recebe mídia já filtrada por
 * `publicacaoStatus`/`accessLevel` (`loadEventAlbum`, Server Component) —
 * este componente não decide visibilidade, só apresenta.
 */
export function ArchiveEventAlbum({ media }: { media: EventAlbumMediaItem[] }) {
  const photos = React.useMemo(() => media.filter((item) => item.mediaType === 'foto'), [media]);
  const videos = React.useMemo(() => media.filter((item) => item.mediaType === 'video'), [media]);
  const audios = React.useMemo(() => media.filter((item) => item.mediaType === 'audio'), [media]);
  const documents = React.useMemo(
    () => media.filter((item) => item.mediaType === 'documento'),
    [media],
  );

  const lightboxPhotos = React.useMemo(() => photos.map(toLightboxPhoto), [photos]);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  const tabs: { value: string; label: string }[] = [{ value: 'tudo', label: 'Tudo' }];
  if (photos.length > 0) tabs.push({ value: 'fotos', label: 'Fotografias' });
  if (videos.length > 0) tabs.push({ value: 'videos', label: 'Vídeos' });
  if (audios.length > 0) tabs.push({ value: 'audios', label: 'Áudios' });
  if (documents.length > 0) tabs.push({ value: 'documentos', label: 'Documentos' });

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="tudo">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="tudo" className="mt-4 flex flex-col gap-8">
          {photos.length > 0 && (
            <section aria-label="Fotografias">
              {(videos.length > 0 || audios.length > 0 || documents.length > 0) && (
                <h2 className="text-muted mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <Camera size={14} />
                  Fotografias
                </h2>
              )}
              <PhotoGrid photos={photos} onOpen={setLightboxIndex} />
            </section>
          )}
          {videos.length > 0 && (
            <section aria-label="Vídeos">
              {(photos.length > 0 || audios.length > 0 || documents.length > 0) && (
                <h2 className="text-muted mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <Video size={14} />
                  Vídeos
                </h2>
              )}
              <VideoList videos={videos} />
            </section>
          )}
          {audios.length > 0 && (
            <section aria-label="Áudios">
              {(photos.length > 0 || videos.length > 0 || documents.length > 0) && (
                <h2 className="text-muted mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <Music size={14} />
                  Áudios
                </h2>
              )}
              <AudioList audios={audios} />
            </section>
          )}
          {documents.length > 0 && (
            <section aria-label="Documentos">
              {(photos.length > 0 || videos.length > 0 || audios.length > 0) && (
                <h2 className="text-muted mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <FileText size={14} />
                  Documentos
                </h2>
              )}
              <DocumentList documents={documents} />
            </section>
          )}
        </TabsContent>

        {photos.length > 0 && (
          <TabsContent value="fotos" className="mt-4">
            <PhotoGrid photos={photos} onOpen={setLightboxIndex} />
          </TabsContent>
        )}
        {videos.length > 0 && (
          <TabsContent value="videos" className="mt-4">
            <VideoList videos={videos} />
          </TabsContent>
        )}
        {audios.length > 0 && (
          <TabsContent value="audios" className="mt-4">
            <AudioList audios={audios} />
          </TabsContent>
        )}
        {documents.length > 0 && (
          <TabsContent value="documentos" className="mt-4">
            <DocumentList documents={documents} />
          </TabsContent>
        )}
      </Tabs>

      {lightboxIndex !== null && (
        <ArchiveLightbox
          photos={lightboxPhotos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
