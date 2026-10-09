import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@vl6/ui';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { DeleteLibraryItemDialog } from '@/modules/library/components/delete-library-item-dialog';
import { LibraryItemForm } from '@/modules/library/components/library-item-form';

export default async function EditLibraryItemPage({
  params,
}: {
  params: Promise<{ libraryItemId: string }>;
}) {
  const session = await requirePagePermission('libraryItem:manage');
  const { libraryItemId } = await params;
  const container = createServerContainer();
  const [item, categories, filesPage, shelves, copies] = await Promise.all([
    container.repositories.libraryItem.findById(libraryItemId),
    container.useCases.listLibraryCategories.execute(session.authContext),
    container.useCases.listAllFileAssets.execute(session.authContext, { limit: 200 }),
    container.repositories.libraryCirculation.listShelvesByTenant(session.authContext.tenantId),
    container.repositories.libraryCirculation.listCopiesByItem(
      session.authContext.tenantId,
      libraryItemId,
    ),
  ]);
  if (!item || item.tenantId !== session.authContext.tenantId || item.deletedAt) notFound();

  const allowPermanent = ['admin', 'super_admin'].includes(session.role?.chave ?? '');
  const hasActiveCopy = copies.some((copy) => copy.situacao !== 'baixado');

  return (
    <section className="flex flex-col gap-6" aria-labelledby="library-item-data-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="library-item-data-title" className="font-display text-xl font-semibold">
            Dados e exemplar
          </h2>
          <p className="text-muted text-sm">
            Edite os dados da obra na fonte única; QR, circulação e histórico usam este mesmo registro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasActiveCopy && (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/admin/acervo/biblioteca/etiquetas?libraryItemId=${item.id}`}>
                Imprimir QR
              </Link>
            </Button>
          )}
          <DeleteLibraryItemDialog
            itemId={item.id}
            title={item.titulo ?? 'Obra sem título'}
            allowPermanent={allowPermanent}
          />
        </div>
      </div>
      <LibraryItemForm
        categories={categories}
        fileAssets={filesPage.items}
        shelves={shelves}
        item={item}
        copy={copies[0] ?? null}
      />
    </section>
  );
}
