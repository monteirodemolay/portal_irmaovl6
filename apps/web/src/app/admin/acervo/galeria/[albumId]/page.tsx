import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { GalleryMediaForm } from '@/modules/gallery/components/gallery-media-form';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export default async function GalleryAlbumDetailPage({
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
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">{album.titulo}</h1>
        <p className="text-muted">
          {album.categoria} · {formatDate(album.dataEvento)}
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Enviar mídia</CardTitle>
        </CardHeader>
        <CardContent>
          <GalleryMediaForm albumId={albumId} />
        </CardContent>
      </Card>

      <div>
        <h2 className="font-display mb-3 text-lg font-semibold">Mídias</h2>
        {media.length === 0 ? (
          <EmptyState title="Nenhuma mídia enviada ainda" />
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
    </div>
  );
}
