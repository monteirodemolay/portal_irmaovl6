import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { ArchiveCollectionEditForm } from '@/modules/archive/components/archive-collection-edit-form';
import {
  ARCHIVE_SEARCH_KIND_LABELS,
  loadArchiveSearchResults,
} from '@/modules/archive/lib/search-archive';

export default async function EditArchiveCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission('archiveCollection:update');
  const { id } = await params;

  const container = createServerContainer();
  const collection = await container.repositories.archiveCollection.findById(id);
  if (!collection || collection.tenantId !== session.authContext.tenantId) notFound();

  const searchResults = await loadArchiveSearchResults(session.authContext, container);
  const availableItems = searchResults.map((result) => ({
    compositeId: result.compositeId,
    title: result.title,
    kindLabel: ARCHIVE_SEARCH_KIND_LABELS[result.kind],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted text-xs uppercase tracking-wide">Coleções do Acervo</p>
        <h1 className="font-display text-2xl font-semibold">{collection.titulo}</h1>
      </div>
      <ArchiveCollectionEditForm collection={collection} availableItems={availableItems} />
    </div>
  );
}
