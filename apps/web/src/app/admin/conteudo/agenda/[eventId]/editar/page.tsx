import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  resolveArchiveItem,
  type ResolvedArchiveItem,
} from '@/modules/archive/lib/resolve-archive-item';
import { EventForm } from '@/modules/agenda/components/event-form';

export default async function EditEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const session = await requirePagePermission('event:update');
  const { eventId } = await params;

  const container = createServerContainer();
  const event = await container.repositories.event.findById(eventId);
  if (!event || event.tenantId !== session.authContext.tenantId) notFound();

  const initialAttachments = (
    await Promise.all(
      (event.arquivosRelacionados ?? []).map((compositeId) =>
        resolveArchiveItem(compositeId, session.authContext, container),
      ),
    )
  ).filter((item): item is ResolvedArchiveItem => item !== null);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Editar evento</h1>
      <EventForm event={event} initialAttachments={initialAttachments} />
    </div>
  );
}
