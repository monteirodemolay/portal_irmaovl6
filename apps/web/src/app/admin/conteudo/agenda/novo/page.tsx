import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { EventForm } from '@/modules/agenda/components/event-form';

export default async function NewEventPage() {
  const session = await requirePagePermission('event:create');
  const container = createServerContainer();
  const paramasonicEntities = (
    await container.repositories.paramasonicEntity.listByTenant(session.authContext.tenantId)
  )
    .sort((a, b) => a.shortName.localeCompare(b.shortName, 'pt-BR'))
    .map((entity) => ({
      id: entity.id,
      label: entity.unitNumber ? `${entity.shortName} nº ${entity.unitNumber}` : entity.shortName,
    }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Novo Evento</h1>
      <EventForm paramasonicEntities={paramasonicEntities} />
    </div>
  );
}
