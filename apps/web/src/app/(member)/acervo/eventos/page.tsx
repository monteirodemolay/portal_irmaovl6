import Link from '@/components/layout/context-link';
import { createServerContainer } from '@vl6/infra';
import { EVENT_KIND_LABELS, type EventKind } from '@vl6/shared';
import { CalendarDays, EmptyState, FilterBar, Image as ImageIcon } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { formatArchiveSummaryLabel } from '@/modules/archive/lib/format-archive-summary-label';
import { loadEventArchiveSummary } from '@/modules/archive/lib/load-event-album';

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
    .filter((event) => new Date(event.dataFim ?? event.dataInicio) < now)
    .filter((event) => !params.tipo || event.tipo === params.tipo)
    .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());

  const summaries = await Promise.all(
    pastEvents.map((event) =>
      loadEventArchiveSummary(container, session.authContext.tenantId, event.id),
    ),
  );

  const archivedEvents = pastEvents.flatMap((event, index) => {
    const summary = summaries[index];
    return summary ? [{ event, summary }] : [];
  });

  const kindsPresent = [...new Set(archivedEvents.map(({ event }) => event.tipo))];
  const filterItems = kindsPresent.map((kind) => ({
    value: kind,
    label: EVENT_KIND_LABELS[kind],
    href: buildHref(params.tipo === kind ? undefined : kind),
  }));

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Eventos com conteúdo"
        description="Sessões, solenidades e acontecimentos que possuem fotos, vídeos, áudios ou documentos publicados no Acervo. Os demais fatos históricos continuam preservados na Linha do Tempo."
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

      {archivedEvents.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title="Nenhum evento com conteúdo publicado"
          description="Quando um acontecimento receber mídias ou documentos publicados, ele aparecerá aqui automaticamente."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {archivedEvents.map(({ event, summary }) => (
            <Link
              key={event.id}
              href={`/acervo/eventos/${event.id}`}
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
              <p className="text-accent mt-2 inline-flex items-center gap-1.5 text-xs font-medium">
                <ImageIcon size={13} />
                {formatArchiveSummaryLabel(summary)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
