import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { ArchiveItemCard, BookOpen, EmptyState, FilterBar } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { archiveItemHref } from '@/modules/archive/lib/archive-item-id';

function buildHref(categoriaId?: string): string {
  return categoriaId ? `/acervo/biblioteca?categoria=${categoriaId}` : '/acervo/biblioteca';
}

export default async function ArchiveLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const session = await requirePagePermission('libraryItem:read');
  const params = await searchParams;

  const container = createServerContainer();
  const [libraryItems, categories] = await Promise.all([
    container.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    container.useCases.listLibraryCategories.execute(session.authContext),
  ]);

  const filteredItems = libraryItems.filter(
    (item) => !params.categoria || item.categoriaId === params.categoria,
  );

  const files = await Promise.all(
    filteredItems.map((item) => container.repositories.fileAsset.findById(item.fileId)),
  );
  const fileById = new Map(filteredItems.map((item, i) => [item.id, files[i]]));
  const categoryNameById = new Map(categories.map((c) => [c.id, c.nome]));

  const filterItems = categories
    .filter((c) => c.categoriaPaiId === null)
    .map((category) => ({
      value: category.id,
      label: category.nome,
      href: buildHref(params.categoria === category.id ? undefined : category.id),
    }));

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title="Biblioteca" backHref="/acervo" />

      {filterItems.length > 0 && (
        <FilterBar
          items={filterItems}
          activeValue={params.categoria}
          ariaLabel="Filtrar por categoria"
          linkComponent={Link}
        />
      )}

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title="Nenhum item catalogado ainda"
          description="Livros, estudos e leituras selecionadas para os Irmãos aparecerão aqui assim que forem catalogados."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.flatMap((item) => {
            const file = fileById.get(item.id);
            if (!file) return [];
            return [
              <ArchiveItemCard
                key={item.id}
                href={archiveItemHref('library', item.id)}
                kindLabel={categoryNameById.get(item.categoriaId) ?? 'Biblioteca'}
                icon={<BookOpen size={14} />}
                titulo={file.titulo}
                descricao={file.descricao}
                linkComponent={Link}
              />,
            ];
          })}
        </div>
      )}
    </div>
  );
}
