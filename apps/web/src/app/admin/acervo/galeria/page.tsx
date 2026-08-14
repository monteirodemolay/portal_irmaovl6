import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export default async function GalleryPage() {
  const session = await requirePagePermission('gallery:read');

  const container = createServerContainer();
  const albums = await container.useCases.listGalleryAlbums.execute(session.authContext);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Galeria</h1>
        <Button asChild>
          <Link href="/admin/acervo/galeria/novo">Novo Álbum</Link>
        </Button>
      </div>

      {albums.length === 0 ? (
        <EmptyState
          title="Nenhum álbum cadastrado"
          action={
            <Button asChild size="sm">
              <Link href="/admin/acervo/galeria/novo">Novo Álbum</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {albums.map((album) => (
            <Link key={album.id} href={`/admin/acervo/galeria/${album.id}`}>
              <Card className="hover:border-accent transition-colors">
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
