import { requirePagePermission } from '@/lib/auth/require-permission';
import { EventForm } from '@/modules/agenda/components/event-form';

export default async function NewEventPage() {
  await requirePagePermission('event:create');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Novo Evento</h1>
      <EventForm />
    </div>
  );
}
