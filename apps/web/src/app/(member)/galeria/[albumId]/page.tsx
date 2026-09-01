import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { EmptyState, Image as GalleryIcon } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { GalleryAlbumGrid } from '@/modules/gallery/components/gallery-album-grid';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export default async function MemberGalleryAlbumPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const session = await requirePagePermission('gallery:read');
  const { albumId } = await params;

  const container = createServerContainer();
  const album = await container.repositories.galleryAlbum.findById(albumId);
  if (!album || album.tenantId !== session.authContext.tenantId) notFound();

  const media = await container.useCases.listGalleryMediaByAlbum.execute(
    session.authContext,
    albumId,
  );

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title={album.titulo}
        description={`${album.categoria} · ${formatDate(album.dataEvento)}`}
        backHref="/galeria"
        backLabel="Fotografias"
      />

      {media.length === 0 ? (
        <EmptyState
          icon={<GalleryIcon size={22} />}
          title="Nenhuma mídia neste álbum ainda"
          description="Fotografias e vídeos aparecerão aqui assim que forem enviados."
        />
      ) : (
        <GalleryAlbumGrid media={media} albumTitulo={album.titulo} />
      )}
    </div>
  );
}
