import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { LibraryItemForm } from '@/modules/library/components/library-item-form';

export default async function NewLibraryItemPage() {
  const session = await requirePagePermission('libraryItem:create');

  const container = createServerContainer();
  const [categories, filesPage, shelves] = await Promise.all([
    container.useCases.listLibraryCategories.execute(session.authContext),
    container.useCases.listAllFileAssets.execute(session.authContext, { limit: 200 }),
    container.repositories.libraryCirculation.listShelvesByTenant(session.authContext.tenantId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Adicionar à Biblioteca</h1>
      <LibraryItemForm categories={categories} fileAssets={filesPage.items} shelves={shelves} />
    </div>
  );
}
