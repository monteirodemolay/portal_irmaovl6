import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@vl6/ui';
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
        <EmptyState title="Nenhum álbum publicado ainda" />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {albums.map((album) => (
            <Link key={album.id} href={`/galeria/${album.id}`}>
              <Card className="hover:border-accent overflow-hidden transition-colors">
                {album.capaUrl && (
                  <img
                    src={album.capaUrl}
                    alt={album.titulo}
                    className="aspect-video w-full object-cover"
                  />
                )}
                <CardHeader>
                  <CardTitle className="text-base">{album.titulo}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted text-sm">
                  {album.categoria} · {formatDate(album.dataEvento)}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
