import Link from '@/components/layout/context-link';
import { createServerContainer } from '@vl6/infra';
import { ArchiveItemCard, EmptyState, FilterBar, Image as GalleryIcon } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { archiveItemHref } from '@/modules/archive/lib/archive-item-id';
import { loadPublishedArchiveEventCards } from '@/modules/archive/lib/load-published-archive-events';

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
  const [allAlbums, publishedEvents, archiveItemsPage] = await Promise.all([
    container.useCases.listGalleryAlbums.execute(session.authContext),
    loadPublishedArchiveEventCards(container, session.authContext, session.role),
    container.repositories.archiveItem.findByTenant(session.authContext.tenantId, { limit: 500 }),
  ]);
  const eventCards = publishedEvents.filter((card) => card.counts.foto + card.counts.video > 0);
  const migratedAlbumIds = new Set(
    archiveItemsPage.items
      .filter((item) => !item.deletedAt)
      .map((item) => item.origemGalleryAlbumId)
      .filter((id): id is string => Boolean(id)),
  );

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  }

  // Enquanto a migração não termina, a Galeria antiga continua disponível.
  // Assim que um álbum recebe um ArchiveItem canônico com proveniência, sua
  // cópia legada deixa de aparecer aqui e o Evento passa a ser a única
  // memória navegável, sem apagar o registro original.
  const cards = [
    ...allAlbums
      .filter((album) => !migratedAlbumIds.has(album.id))
      .map((album) => ({
        key: `album-${album.id}`,
        href: archiveItemHref('gallery-album', album.id),
        thumbnailUrl: album.capaUrl,
        kindLabel: album.categoria,
        titulo: album.titulo,
        descricao: formatDate(album.dataEvento),
        categoria: album.categoria,
        date: album.dataEvento,
      })),
    ...eventCards.map((card) => ({
      key: `event-${card.eventId}`,
      href: `/acervo/eventos/${card.eventId}`,
      thumbnailUrl: card.coverSrc,
      kindLabel: 'Evento',
      titulo: card.titulo,
      descricao: `${formatDate(card.dataInicio)} · ${card.counts.foto + card.counts.video} ${card.counts.foto + card.counts.video === 1 ? 'mídia' : 'mídias'}`,
      categoria: 'Evento',
      date: card.dataInicio,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const categorias = [...new Set(cards.map((card) => card.categoria))].sort();
  const filterItems = categorias.map((categoria) => ({
    value: categoria,
    label: categoria,
    href: buildHref(params.categoria === categoria ? undefined : categoria),
  }));
  const filteredCards = params.categoria
    ? cards.filter((card) => card.categoria === params.categoria)
    : cards;

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

      {filteredCards.length === 0 ? (
        <EmptyState
          icon={<GalleryIcon size={22} />}
          title="Nenhum álbum publicado ainda"
          description="Álbuns de sessões, solenidades e acontecimentos da Loja aparecerão aqui assim que forem publicados."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => (
            <ArchiveItemCard
              key={card.key}
              href={card.href}
              thumbnailUrl={card.thumbnailUrl}
              kindLabel={card.kindLabel}
              icon={<GalleryIcon size={14} />}
              titulo={card.titulo}
              descricao={card.descricao}
              linkComponent={Link}
            />
          ))}
        </div>
      )}
    </div>
  );
}
