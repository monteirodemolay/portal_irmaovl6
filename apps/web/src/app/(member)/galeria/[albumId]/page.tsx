import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { Badge, Card, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';

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
        <EmptyState title="Nenhuma mídia neste álbum ainda" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {media.map((item) => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
              <Card className="hover:border-accent overflow-hidden transition-colors">
                {item.tipo === 'foto' ? (
                  <img src={item.url} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="bg-background flex aspect-square w-full items-center justify-center">
                    <Badge variant="outline">Vídeo</Badge>
                  </div>
                )}
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
