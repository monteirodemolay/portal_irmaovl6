import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { ArchiveItemCard, EmptyState, FileText, FilterBar } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { archiveItemHref } from '@/modules/archive/lib/archive-item-id';

function buildHref(categoriaId?: string): string {
  return categoriaId ? `/acervo/documentos?categoria=${categoriaId}` : '/acervo/documentos';
}

export default async function ArchiveDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const session = await requirePagePermission('file:read');
  const params = await searchParams;

  const container = createServerContainer();
  const [filesPage, categories, libraryItems] = await Promise.all([
    container.useCases.listAllFileAssets.execute(session.authContext, { limit: 200 }),
    container.useCases.listFileCategories.execute(session.authContext),
    container.repositories.libraryItem.listByTenant(session.authContext.tenantId),
  ]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.nome]));
  const libraryFileIds = new Set(libraryItems.map((item) => item.fileId));

  const documents = filesPage.items
    .filter((file) => file.publicado && !libraryFileIds.has(file.id))
    .filter((file) => !params.categoria || file.categoriaId === params.categoria);

  const filterItems = categories.map((category) => ({
    value: category.id,
    label: category.nome,
    href: buildHref(params.categoria === category.id ? undefined : category.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title="Documentos" backHref="/acervo" />

      {categories.length > 0 && (
        <FilterBar
          items={filterItems}
          activeValue={params.categoria}
          ariaLabel="Filtrar por categoria"
          linkComponent={Link}
        />
      )}

      {documents.length === 0 ? (
        <EmptyState
          icon={<FileText size={22} />}
          title="Nenhum documento publicado ainda"
          description="Atas autorizadas, circulares e registros institucionais aparecerão aqui assim que forem publicados."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((file) => (
            <ArchiveItemCard
              key={file.id}
              href={archiveItemHref('file', file.id)}
              kindLabel={categoryNameById.get(file.categoriaId) ?? 'Documento'}
              icon={<FileText size={14} />}
              titulo={file.titulo}
              descricao={file.descricao}
              linkComponent={Link}
            />
          ))}
        </div>
      )}
    </div>
  );
}
