import { requirePagePermission } from '@/lib/auth/require-permission';
import { ArchiveExhibitionForm } from '@/modules/archive/components/archive-exhibition-form';

export default async function NewArchiveExhibitionPage() {
  await requirePagePermission('archiveExhibition:create');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Nova Exposição</h1>
      <p className="text-muted max-w-lg text-sm">
        Crie a exposição com o título e a descrição editorial. Depois de criada, você poderá montar
        as seções narrativas e publicá-la.
      </p>
      <ArchiveExhibitionForm />
    </div>
  );
}
