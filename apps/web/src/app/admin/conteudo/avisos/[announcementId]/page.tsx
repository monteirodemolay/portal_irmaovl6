import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  deleteAnnouncementAction,
  updateAnnouncementAction,
} from '@/modules/content/actions/content-actions';
import { AnnouncementForm } from '@/modules/content/components/announcement-form';
import { DeleteButton } from '@/components/admin/delete-button';

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ announcementId: string }>;
}) {
  const session = await requirePagePermission('announcement:update');
  const { announcementId } = await params;

  const container = createServerContainer();
  const announcement = await container.repositories.announcement.findById(announcementId);
  if (!announcement || announcement.tenantId !== session.authContext.tenantId) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Editar Aviso</h1>
        <DeleteButton
          action={deleteAnnouncementAction.bind(null, announcementId)}
          confirmMessage={`Excluir "${announcement.titulo}"? Fica registrado em Concluídos.`}
          redirectTo="/admin/conteudo/avisos"
        />
      </div>
      <AnnouncementForm
        action={updateAnnouncementAction.bind(null, announcementId)}
        announcement={announcement}
      />
    </div>
  );
}
