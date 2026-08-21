import { requirePagePermission } from '@/lib/auth/require-permission';
import { createAnnouncementAction } from '@/modules/content/actions/content-actions';
import { AnnouncementForm } from '@/modules/content/components/announcement-form';

export default async function NewAnnouncementPage() {
  await requirePagePermission('announcement:create');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Novo Aviso</h1>
      <AnnouncementForm action={createAnnouncementAction} />
    </div>
  );
}
