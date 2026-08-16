import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { ArchiveCatalogEntryEditForm } from '@/modules/archive/components/archive-catalog-entry-edit-form';
import { resolveArchiveItem } from '@/modules/archive/lib/resolve-archive-item';

export default async function EditArchiveCatalogEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePagePermission('archiveCatalog:manage');
  const { id } = await params;

  const container = createServerContainer();
  const entry = await container.repositories.archiveCatalogEntry.findById(id);
  if (!entry || entry.tenantId !== session.authContext.tenantId) notFound();

  const item = await resolveArchiveItem(entry.origemId, session.authContext, container);
  const itemLabel = item ? `${item.kindLabel} · ${item.titulo}` : '(registro removido)';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted text-xs uppercase tracking-wide">Catalogação</p>
        <h1 className="font-display text-2xl font-semibold">{itemLabel}</h1>
      </div>
      <ArchiveCatalogEntryEditForm entry={entry} itemLabel={itemLabel} />
    </div>
  );
}
