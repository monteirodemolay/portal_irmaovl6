import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { ArchiveItemCard, EmptyState, Image as GalleryIcon } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export default async function MemberGalleryPage() {
  const session = await requirePagePermission('gallery:read');

  const container = createServerContainer();
  const albums = await container.useCases.listGalleryAlbums.execute(session.authContext);

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title="Fotografias" description="Registros de sessões e eventos da Loja." />

      {albums.length === 0 ? (
        <EmptyState
          icon={<GalleryIcon size={22} />}
          title="Nenhum álbum publicado ainda"
          description="Álbuns de sessões, solenidades e acontecimentos da Loja aparecerão aqui assim que forem publicados."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <ArchiveItemCard
              key={album.id}
              href={`/galeria/${album.id}`}
              thumbnailUrl={album.capaUrl}
              kindLabel={album.categoria}
              icon={<GalleryIcon size={14} />}
              titulo={album.titulo}
              descricao={formatDate(album.dataEvento)}
              linkComponent={Link}
            />
          ))}
        </div>
      )}
    </div>
  );
}
