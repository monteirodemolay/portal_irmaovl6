import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { ArchiveItemCard, EmptyState, FilterBar, Image as GalleryIcon } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { archiveItemHref } from '@/modules/archive/lib/archive-item-id';

function buildHref(categoria?: string): string {
  return categoria
    ? `/acervo/fotografias?categoria=${encodeURIComponent(categoria)}`
    : '/acervo/fotografias';
}

export default async function ArchivePhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const session = await requirePagePermission('gallery:read');
  const params = await searchParams;

  const container = createServerContainer();
  const allAlbums = await container.useCases.listGalleryAlbums.execute(session.authContext);
  const filteredAlbums = params.categoria
    ? allAlbums.filter((album) => album.categoria === params.categoria)
    : allAlbums;

  const categorias = [...new Set(allAlbums.map((album) => album.categoria))].sort();
  const filterItems = categorias.map((categoria) => ({
    value: categoria,
    label: categoria,
    href: buildHref(params.categoria === categoria ? undefined : categoria),
  }));

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  }

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title="Fotos e Vídeos" backHref="/acervo" />

      {filterItems.length > 0 && (
        <FilterBar
          items={filterItems}
          activeValue={params.categoria}
          ariaLabel="Filtrar por categoria"
          linkComponent={Link}
        />
      )}

      {filteredAlbums.length === 0 ? (
        <EmptyState
          icon={<GalleryIcon size={22} />}
          title="Nenhum álbum publicado ainda"
          description="Álbuns de sessões, solenidades e acontecimentos da Loja aparecerão aqui assim que forem publicados."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAlbums.map((album) => (
            <ArchiveItemCard
              key={album.id}
              href={archiveItemHref('gallery-album', album.id)}
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
