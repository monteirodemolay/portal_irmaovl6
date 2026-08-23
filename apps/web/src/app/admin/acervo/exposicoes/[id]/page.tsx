import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { ArchiveExhibitionEditForm } from '@/modules/archive/components/archive-exhibition-edit-form';
import {
  ARCHIVE_SEARCH_KIND_LABELS,
  loadArchiveSearchResults,
} from '@/modules/archive/lib/search-archive';

export default async function EditArchiveExhibitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission('archiveExhibition:update');
  const { id } = await params;

  const container = createServerContainer();
  const exhibition = await container.repositories.archiveExhibition.findById(id);
  if (!exhibition || exhibition.tenantId !== session.authContext.tenantId) notFound();

  const searchResults = await loadArchiveSearchResults(session.authContext, container);
  const availableItems = searchResults.map((result) => ({
    compositeId: result.compositeId,
    title: result.title,
    kindLabel: ARCHIVE_SEARCH_KIND_LABELS[result.kind],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted text-xs uppercase tracking-wide">Exposições Virtuais</p>
        <h1 className="font-display text-2xl font-semibold">{exhibition.titulo}</h1>
      </div>
      <ArchiveExhibitionEditForm exhibition={exhibition} availableItems={availableItems} />
    </div>
  );
}
