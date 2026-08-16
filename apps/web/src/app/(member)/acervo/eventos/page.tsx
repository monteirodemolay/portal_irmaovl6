import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { EVENT_KIND_LABELS, type EventKind } from '@vl6/shared';
import { CalendarDays, EmptyState, FilterBar } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(date));
}

function buildHref(tipo?: EventKind): string {
  return tipo ? `/acervo/eventos?tipo=${tipo}` : '/acervo/eventos';
}

export default async function ArchiveEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const session = await requirePagePermission('event:read');
  const params = await searchParams;

  const container = createServerContainer();
  const page = await container.useCases.listAllEvents.execute(session.authContext, {
    limit: 200,
  });

  const now = new Date();
  const pastEvents = page.items
    .filter((event) => new Date(event.dataFim) < now)
    .filter((event) => !params.tipo || event.tipo === params.tipo)
    .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());

  const kindsPresent = [...new Set(page.items.map((event) => event.tipo))];
  const filterItems = kindsPresent.map((kind) => ({
    value: kind,
    label: EVENT_KIND_LABELS[kind],
    href: buildHref(params.tipo === kind ? undefined : kind),
  }));

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Eventos"
        description="Registro histórico de sessões, solenidades e acontecimentos já realizados."
        backHref="/acervo"
      />

      {filterItems.length > 0 && (
        <FilterBar
          items={filterItems}
          activeValue={params.tipo}
          ariaLabel="Filtrar por tipo de evento"
          linkComponent={Link}
        />
      )}

      {pastEvents.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title="Nenhum evento passado registrado ainda"
          description="Eventos já realizados pela Loja aparecerão aqui assim que a agenda avançar."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {pastEvents.map((event) => (
            <Link
              key={event.id}
              href={`/eventos/${event.id}`}
              className="border-border hover:border-accent group rounded-lg border p-4 transition-colors"
            >
              <div className="text-accent flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                <CalendarDays size={14} />
                {EVENT_KIND_LABELS[event.tipo]}
              </div>
              <h3 className="font-display group-hover:text-accent mt-2 font-semibold transition-colors">
                {event.titulo}
              </h3>
              <p className="text-muted mt-1 text-xs leading-5">
                {formatDate(event.dataInicio)} · {event.local}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
