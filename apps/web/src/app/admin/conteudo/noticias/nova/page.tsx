import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { createNewsAction } from '@/modules/content/actions/content-actions';
import { NewsForm } from '@/modules/content/components/news-form';

export default async function NewNewsPage() {
  const session = await requirePagePermission('news:create');
  const container = createServerContainer();
  const eventsPage = await container.useCases.listAllEvents.execute(session.authContext, {
    limit: 500,
  });
  const eventOptions = eventsPage.items.map((event) => ({
    id: event.id,
    titulo: event.titulo,
    dataInicio: event.dataInicio.toISOString(),
    local: event.local,
    tipo: event.tipo,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Nova Notícia</h1>
      <NewsForm action={createNewsAction} events={eventOptions} />
    </div>
  );
}
