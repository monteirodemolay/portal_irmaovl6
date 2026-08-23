import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { createServerContainer } from '@vl6/infra';
import {
  ArchiveItemCard,
  BookOpen,
  CalendarDays,
  EmptyState,
  FileText,
  Image as GalleryIcon,
} from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { RelationsSection } from '@/modules/archive/components/relations-section';
import { resolveArchiveItem } from '@/modules/archive/lib/resolve-archive-item';
import type { ArchiveItemKind } from '@/modules/archive/lib/archive-item-id';

const KIND_ICONS: Record<ArchiveItemKind, ReactNode> = {
  file: <FileText size={14} />,
  library: <BookOpen size={14} />,
  'gallery-album': <GalleryIcon size={14} />,
  'gallery-media': <GalleryIcon size={14} />,
  'archive-item': <CalendarDays size={14} />,
};

export default async function ArchiveCollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireSession();
  const { slug } = await params;

  const container = createServerContainer();
  const collection = await container.useCases.getArchiveCollectionBySlug.execute(
    session.authContext,
    slug,
  );
  if (!collection) notFound();

  const resolvedItems = (
    await Promise.all(
      collection.itemIds.map((itemId) =>
        resolveArchiveItem(itemId, session.authContext, container, session.role),
      ),
    )
  ).filter((item) => item !== null);

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title={collection.titulo}
        backHref="/acervo/colecoes"
        backLabel="Coleções"
      />

      {collection.descricaoEditorial && (
        <p className="text-muted max-w-2xl text-sm leading-6">{collection.descricaoEditorial}</p>
      )}
      {collection.curadoPor && (
        <p className="text-muted text-xs uppercase tracking-wide">
          Curadoria de {collection.curadoPor}
        </p>
      )}

      {resolvedItems.length === 0 ? (
        <EmptyState title="Nenhum item disponível nesta coleção" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resolvedItems.map((item) => (
            <ArchiveItemCard
              key={item.compositeId}
              href={`/acervo/item/${item.compositeId}`}
              kindLabel={item.kindLabel}
              icon={KIND_ICONS[item.kind]}
              titulo={item.titulo}
              descricao={item.descricao}
              linkComponent={Link}
            />
          ))}
        </div>
      )}

      <RelationsSection
        nodeTipo="archiveCollection"
        nodeId={collection.id}
        centerLabel={collection.titulo}
        centerKindLabel="Coleção"
        authContext={session.authContext}
        container={container}
      />
    </div>
  );
}
