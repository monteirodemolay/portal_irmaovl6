import { requirePagePermission } from '@/lib/auth/require-permission';
import { ArchiveCollectionForm } from '@/modules/archive/components/archive-collection-form';

export default async function NewArchiveCollectionPage() {
  await requirePagePermission('archiveCollection:create');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Nova Coleção</h1>
      <p className="text-muted max-w-lg text-sm">
        Crie a coleção com o título e a descrição editorial. Depois de criada, você poderá adicionar
        itens do Acervo e publicá-la.
      </p>
      <ArchiveCollectionForm />
    </div>
  );
}
