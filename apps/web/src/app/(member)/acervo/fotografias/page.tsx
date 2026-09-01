import Link from 'next/link';
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
  const [allAlbums, publishedEvents] = await Promise.all([
    container.useCases.listGalleryAlbums.execute(session.authContext),
    loadPublishedArchiveEventCards(container, session.authContext, session.role),
  ]);
  const eventCards = publishedEvents.filter((card) => card.counts.foto + card.counts.video > 0);

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  }

  // Duas fontes ainda coexistem — `GalleryAlbum` (legado) e `ArchiveItem`
  // publicado pela Central de Publicação (Fase 2/3) — unificadas num só
  // grid, ordenado por data, pra "publiquei um evento" sempre significar
  // "aparece aqui automaticamente", sem depender de saber que existem dois
  // sistemas por trás.
  const cards = [
    ...allAlbums.map((album) => ({
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
