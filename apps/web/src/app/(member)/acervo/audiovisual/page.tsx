import Link from '@/components/layout/context-link';
import { createServerContainer } from '@vl6/infra';
import { ArchiveItemCard, EmptyState, PlayCircle } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { archiveItemHref } from '@/modules/archive/lib/archive-item-id';
import { loadPublishedArchiveEventCards } from '@/modules/archive/lib/load-published-archive-events';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export default async function ArchiveAudiovisualPage() {
  const session = await requireSession();
  const container = createServerContainer();
  const { authContext } = session;

  const [filesPage, albums, publishedEvents] = await Promise.all([
    container.useCases.listAllFileAssets.execute(authContext, { limit: 200 }),
    container.useCases.listGalleryAlbums.execute(authContext),
    loadPublishedArchiveEventCards(container, authContext, session.role),
  ]);

  const videoFiles = filesPage.items.filter((file) => file.publicado && file.tipo === 'video');

  const albumMedia = await Promise.all(
    albums.map(async (album) => ({
      album,
      media: await container.useCases.listGalleryMediaByAlbum.execute(authContext, album.id),
    })),
  );
  const videoMedia = albumMedia.flatMap(({ album, media }) =>
    media.filter((item) => item.tipo === 'video').map((item) => ({ album, media: item })),
  );

  // Conteúdo novo do Acervo: eventos publicados que possuem vídeo. O card
  // abre a memória canônica do acontecimento, onde vídeo, fotos, notícia,
  // Instagram, participantes e demais relações permanecem juntos.
  const eventVideos = publishedEvents
    .filter((card) => card.counts.video > 0)
    .sort((a, b) => b.dataInicio.getTime() - a.dataInicio.getTime());

  const hasContent = videoFiles.length > 0 || videoMedia.length > 0 || eventVideos.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Audiovisual"
        description="Vídeos preservados no Acervo, reunindo o conteúdo atual por acontecimento e o material legado ainda em migração."
        backHref="/acervo"
      />

      {!hasContent ? (
        <EmptyState
          icon={<PlayCircle size={22} />}
          title="Nenhum conteúdo audiovisual publicado ainda"
          description="Vídeos vinculados a acontecimentos, documentos ou registros legados aparecerão aqui."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {eventVideos.map((card) => (
            <ArchiveItemCard
              key={`event-${card.eventId}`}
              href={`/acervo/eventos/${card.eventId}`}
              thumbnailUrl={card.coverSrc}
              kindLabel="Vídeo de acontecimento"
              icon={<PlayCircle size={14} />}
              titulo={card.titulo}
              descricao={`${formatDate(card.dataInicio)} · ${card.counts.video} ${card.counts.video === 1 ? 'vídeo' : 'vídeos'}`}
              linkComponent={Link}
            />
          ))}
          {videoFiles.map((file) => (
            <ArchiveItemCard
              key={`file-${file.id}`}
              href={archiveItemHref('file', file.id)}
              kindLabel="Vídeo legado"
              icon={<PlayCircle size={14} />}
              titulo={file.titulo}
              descricao={file.descricao}
              linkComponent={Link}
            />
          ))}
          {videoMedia.map(({ album, media }) => (
            <ArchiveItemCard
              key={`media-${media.id}`}
              href={archiveItemHref('gallery-media', media.id)}
              kindLabel="Vídeo legado"
              icon={<PlayCircle size={14} />}
              titulo={album.titulo}
              descricao={`${album.categoria} · registro da Loja`}
              linkComponent={Link}
            />
          ))}
        </div>
      )}
    </div>
  );
}
