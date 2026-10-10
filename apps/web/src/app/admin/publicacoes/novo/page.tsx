import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { EVENT_KINDS, normalizeEventLocation, type EventKind } from '@vl6/shared';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { EventForm } from '@/modules/agenda/components/event-form';
import { EventFormExperience } from '@/modules/agenda/components/event-form-experience';
import { createWorkspaceEventAction } from '@/modules/agenda/actions/agenda-actions';

export const metadata = { title: 'Novo acontecimento · VL6' };
export const dynamic = 'force-dynamic';

export default async function NewPublicationPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const session = await requirePagePermission('event:create');
  if (!hasPermission(session.authContext, 'event:read')) notFound();
  const { tipo } = await searchParams;
  const initialType: EventKind | undefined = EVENT_KINDS.includes(tipo as EventKind)
    ? (tipo as EventKind)
    : undefined;
  const c = createServerContainer();
  const [entities, locationOptions] = await Promise.all([
    c.repositories.paramasonicEntity.listByTenant(session.authContext.tenantId),
    (async () => {
      const locations = new Set<string>();
      let cursor: string | undefined;
      do {
        const result = await c.useCases.listAllEvents.execute(session.authContext, {
          limit: 100,
          cursor,
        });
        result.items.forEach((event) => {
          if (event.local?.trim()) locations.add(normalizeEventLocation(event.local));
        });
        cursor = result.hasMore ? (result.nextCursor ?? undefined) : undefined;
      } while (cursor);
      return [...locations];
    })(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      <Link href="/admin/publicacoes" className="inline-flex min-h-11 items-center text-sm font-semibold underline">
        ← Acontecimentos
      </Link>

      <header className="border-border bg-surface overflow-hidden rounded-3xl border shadow-sm">
        <div className="bg-primary px-6 py-7 text-white md:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">Entrada única</p>
          <h1 className="font-display mt-2 text-3xl font-semibold md:text-4xl">Registrar acontecimento</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/80 md:text-base">
            Cadastre agora somente o que você já sabe. O Acontecimento entra na Agenda e, depois,
            você completa notícia, fotos, vídeos, documentos e Acervo pela mesma Ficha.
          </p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-4 md:p-6">
          {[
            ['Agora', 'Agenda', 'Título, data, local e tipo'],
            ['Depois', 'Comunicação', 'Notícia, aviso e divulgação'],
            ['Quando houver', 'Mídias', 'Fotos, vídeos e documentos'],
            ['Quando estiver pronto', 'Memória', 'Acervo e preservação histórica'],
          ].map(([eyebrow, title, detail], index) => (
            <div key={title} className={`rounded-2xl border p-4 ${index === 0 ? 'border-accent bg-accent/10' : 'border-border'}`}>
              <p className="text-muted text-xs font-semibold uppercase tracking-wide">{eyebrow}</p>
              <p className="mt-1 font-semibold">{title}</p>
              <p className="text-muted mt-1 text-xs">{detail}</p>
            </div>
          ))}
        </div>
      </header>

      <EventFormExperience locationOptions={locationOptions}>
        <EventForm
          action={createWorkspaceEventAction}
          initialType={initialType}
          paramasonicEntities={entities.map((e) => ({
            id: e.id,
            label: e.unitNumber ? `${e.shortName} nº ${e.unitNumber}` : e.shortName,
          }))}
        />
      </EventFormExperience>
    </div>
  );
}
