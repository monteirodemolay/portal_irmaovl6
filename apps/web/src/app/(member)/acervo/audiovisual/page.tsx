import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { ArchiveItemCard, EmptyState, PlayCircle } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { archiveItemHref } from '@/modules/archive/lib/archive-item-id';

export default async function ArchiveAudiovisualPage() {
  const session = await requireSession();
  const container = createServerContainer();
  const { authContext } = session;

  const [filesPage, albums] = await Promise.all([
    container.useCases.listAllFileAssets.execute(authContext, { limit: 200 }),
    container.useCases.listGalleryAlbums.execute(authContext),
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

  const hasContent = videoFiles.length > 0 || videoMedia.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title="Audiovisual" backHref="/acervo" />

      {!hasContent ? (
        <EmptyState
          icon={<PlayCircle size={22} />}
          title="Nenhum conteúdo audiovisual publicado ainda"
          description="Vídeos publicados em Documentos ou na Galeria aparecerão aqui."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {videoFiles.map((file) => (
            <ArchiveItemCard
              key={`file-${file.id}`}
              href={archiveItemHref('file', file.id)}
              kindLabel="Vídeo"
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
              kindLabel="Vídeo"
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
