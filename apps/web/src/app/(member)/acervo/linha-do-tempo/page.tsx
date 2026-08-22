import Link from 'next/link';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { EVENT_KIND_LABELS } from '@vl6/shared';
import { CalendarDays, Compass, EmptyState, Image as ImageIcon } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { formatArchiveSummaryLabel } from '@/modules/archive/lib/format-archive-summary-label';
import { loadEventArchiveSummary } from '@/modules/archive/lib/load-event-album';

interface TimelineEntry {
  date: Date;
  kindLabel: string;
  titulo: string;
  descricao: string;
  href: string;
  archiveSummaryLabel: string | null;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(date));
}

function formatPeriod(inicio: Date, fim: Date): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', { year: 'numeric', month: 'short' });
  return `${formatter.format(new Date(inicio))} — ${formatter.format(new Date(fim))}`;
}

export default async function ArchiveTimelinePage() {
  const session = await requireSession();
  const { authContext } = session;
  const container = createServerContainer();

  const canReadBoardTerms = hasPermission(authContext, 'boardTerm:read');
  const canReadEvents = hasPermission(authContext, 'event:read');

  const [terms, eventsPage] = await Promise.all([
    canReadBoardTerms
      ? container.repositories.boardTerm.listByTenant(authContext.tenantId)
      : Promise.resolve([]),
    canReadEvents
      ? container.useCases.listAllEvents.execute(authContext, { limit: 200 })
      : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
  ]);

  const now = new Date();

  const termEntries: TimelineEntry[] = terms.map((term) => ({
    date: term.periodoInicio,
    kindLabel: 'Gestão',
    titulo: term.nome,
    descricao: formatPeriod(term.periodoInicio, term.periodoFim),
    href: `/acervo/gestoes/${term.id}`,
    archiveSummaryLabel: null,
  }));

  const pastEvents = eventsPage.items.filter(
    (event) => new Date(event.dataFim ?? event.dataInicio) < now,
  );

  // Uma consulta em lote sobre a lista já carregada (não N+1 por render) —
  // mesmo padrão de `/acervo/eventos/page.tsx` (Fase 4) — decide se a
  // entrada linka para o álbum público do Acervo VL6 e exibe a contagem de
  // mídia publicada abaixo do título.
  const archiveSummaries = await Promise.all(
    pastEvents.map((event) => loadEventArchiveSummary(container, authContext.tenantId, event.id)),
  );

  const eventEntries: TimelineEntry[] = pastEvents.map((event, index) => {
    const summary = archiveSummaries[index];
    return {
      date: event.dataInicio,
      kindLabel: EVENT_KIND_LABELS[event.tipo],
      titulo: event.titulo,
      descricao: event.local,
      href: summary ? `/acervo/eventos/${event.id}` : `/eventos/${event.id}`,
      archiveSummaryLabel: summary ? formatArchiveSummaryLabel(summary) : null,
    };
  });

  const entries = [...termEntries, ...eventEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const entriesByYear = new Map<number, TimelineEntry[]>();
  for (const entry of entries) {
    const year = new Date(entry.date).getFullYear();
    const group = entriesByYear.get(year) ?? [];
    group.push(entry);
    entriesByYear.set(year, group);
  }

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Linha do Tempo"
        description="Gestões e eventos já realizados, em ordem cronológica — a alternativa textual completa à futura Constelação da Memória."
        backHref="/acervo"
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={<Compass size={22} />}
          title="Nenhum registro histórico ainda"
          description="Gestões e eventos passados aparecerão aqui conforme forem cadastrados."
        />
      ) : (
        <div className="flex flex-col gap-8">
          {[...entriesByYear.entries()].map(([year, yearEntries]) => (
            <section key={year} aria-labelledby={`year-${year}`}>
              <h2 id={`year-${year}`} className="text-accent font-display text-xl font-semibold">
                {year}
              </h2>
              <ol className="border-border mt-3 flex flex-col gap-3 border-l pl-5">
                {yearEntries.map((entry, index) => (
                  <li key={`${entry.href}-${index}`} className="relative">
                    <span className="bg-accent absolute -left-[23px] top-1.5 h-2 w-2 rounded-full" />
                    <Link href={entry.href} className="group">
                      <div className="text-accent flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                        <CalendarDays size={12} />
                        {entry.kindLabel} · {formatDate(entry.date)}
                      </div>
                      <p className="font-display group-hover:text-accent mt-1 font-semibold transition-colors">
                        {entry.titulo}
                      </p>
                      <p className="text-muted text-xs">{entry.descricao}</p>
                      {entry.archiveSummaryLabel && (
                        <p className="text-accent mt-1 inline-flex items-center gap-1.5 text-xs font-medium">
                          <ImageIcon size={12} />
                          {entry.archiveSummaryLabel}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
