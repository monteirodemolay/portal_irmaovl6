import { notFound, redirect } from 'next/navigation';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  deleteAnnouncementAction,
  updateAnnouncementAction,
} from '@/modules/content/actions/content-actions';
import { AnnouncementForm } from '@/modules/content/components/announcement-form';
import { AnnouncementReachReportCard } from '@/modules/content/components/announcement-reach-report';
import { DeleteButton } from '@/components/admin/delete-button';

export default async function EditAnnouncementPage({
  params,
  searchParams,
}: {
  params: Promise<{ announcementId: string }>;
  searchParams: Promise<{ manutencao?: string }>;
}) {
  const session = await requirePagePermission('announcement:update');
  const { announcementId } = await params;

  const container = createServerContainer();
  const announcement = await container.repositories.announcement.findById(announcementId);
  if (!announcement || announcement.tenantId !== session.authContext.tenantId) notFound();
  if (
    announcement.eventId &&
    !announcement.deletedAt &&
    (await searchParams).manutencao !== '1' &&
    hasPermission(session.authContext, 'event:read')
  ) {
    const event = await container.repositories.event.findById(announcement.eventId);
    if (event && event.tenantId === session.authContext.tenantId && !event.deletedAt)
      redirect(`/admin/publicacoes/${encodeURIComponent(event.id)}#aviso`);
  }

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
      {announcement.publicado && hasPermission(session.authContext, 'notification:manage') && (
        <AnnouncementReachReportCard announcementId={announcementId} />
      )}
    </div>
  );
}
