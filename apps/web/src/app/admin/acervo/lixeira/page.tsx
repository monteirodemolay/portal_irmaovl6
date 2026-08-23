import { requirePagePermission } from '@/lib/auth/require-permission';
import { loadTrashAction } from '@/modules/archive/actions/trash-actions';
import { TrashManager } from '@/modules/archive/components/trash-manager';

/**
 * Lixeira administrativa do Acervo — Fase 3
 * (docs/architecture/11-acervo-vl6.md §11.6). Lista `ArchiveItem`/
 * `ArchiveMedia` soft-deletados do tenant e permite restaurar; sem
 * paginação sofisticada nem expurgo definitivo nesta fase.
 */
export default async function LixeiraPage() {
  await requirePagePermission('archiveItem:delete');
  const trash = await loadTrashAction();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Lixeira do Acervo</h1>
        <p className="text-muted max-w-lg text-sm">
          Itens e mídias movidos para a lixeira continuam guardados — restaure a qualquer momento.
        </p>
      </div>
      <TrashManager initialTrash={trash} />
    </div>
  );
}
