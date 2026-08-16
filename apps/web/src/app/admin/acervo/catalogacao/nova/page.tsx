import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { ArchiveCatalogEntryForm } from '@/modules/archive/components/archive-catalog-entry-form';
import {
  ARCHIVE_SEARCH_KIND_LABELS,
  loadArchiveSearchResults,
} from '@/modules/archive/lib/search-archive';

export default async function NewArchiveCatalogEntryPage() {
  const session = await requirePagePermission('archiveCatalog:manage');

  const container = createServerContainer();
  const searchResults = await loadArchiveSearchResults(session.authContext, container);
  const items = searchResults.map((result) => ({
    compositeId: result.href.replace('/acervo/item/', ''),
    title: result.title,
    kindLabel: ARCHIVE_SEARCH_KIND_LABELS[result.kind],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Nova Ficha de Catalogação</h1>
        <p className="text-muted max-w-lg text-sm">
          Selecione um item já existente do Acervo e complemente com título curado, contexto
          histórico e tags. Nasce como rascunho — publicar é uma ação separada.
        </p>
      </div>
      <ArchiveCatalogEntryForm items={items} />
    </div>
  );
}
