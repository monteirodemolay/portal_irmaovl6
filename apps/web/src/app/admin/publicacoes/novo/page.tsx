import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { EventForm } from '@/modules/agenda/components/event-form';
import { createWorkspaceEventAction } from '@/modules/agenda/actions/agenda-actions';

export const metadata = { title: 'Nova publicação · VL6' };

export default async function NewPublicationPage() {
  const session = await requirePagePermission('event:create');
  if (!hasPermission(session.authContext, 'event:read')) notFound();
  const c = createServerContainer();
  const entities = await c.repositories.paramasonicEntity.listByTenant(
    session.authContext.tenantId,
  );
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Link href="/admin/publicacoes" className="text-sm underline">
        ← Publicações e Agenda
      </Link>
      <header>
        <h1 className="font-display text-3xl font-semibold">Nova publicação</h1>
        <p className="text-muted mt-2">
          Cadastre o acontecimento uma vez. Em seguida, edite a notícia, prepare o aviso e organize
          todos os arquivos neste mesmo espaço.
        </p>
      </header>
      <div className="border-border bg-surface rounded-2xl border p-6">
        <EventForm
          action={createWorkspaceEventAction}
          paramasonicEntities={entities.map((e) => ({
            id: e.id,
            label: e.unitNumber ? `${e.shortName} nº ${e.unitNumber}` : e.shortName,
          }))}
        />
      </div>
    </div>
  );
}
