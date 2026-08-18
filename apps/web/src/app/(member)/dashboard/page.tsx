import { hasPermission } from '@vl6/domain';
import { CalendarDays, Card, EmptyState, Sparkles } from '@vl6/ui';
import { createServerContainer } from '@vl6/infra';
import { getUpcomingEventsForPortal } from '@/lib/agenda/get-upcoming-events';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { resolveMemberDisplayName } from '@/lib/membership/resolve-display-name';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { AcervoPanel } from '@/modules/dashboard/components/acervo-panel';
import { AgendaPanel } from '@/modules/dashboard/components/agenda-panel';
import { AnniversariesPanel } from '@/modules/dashboard/components/anniversaries-panel';
import { AvisosCard } from '@/modules/dashboard/components/avisos-card';
import { DailyQuoteCard } from '@/modules/dashboard/components/daily-quote-card';
import { DashboardSectionHeading } from '@/modules/dashboard/components/dashboard-section-heading';
import { NextEventCard } from '@/modules/dashboard/components/next-event-card';
import { timeOfDayGreeting } from '@/modules/dashboard/lib/greeting';
import { pickQuote } from '@/modules/dashboard/lib/masonic-quotes';

export default async function DashboardPage() {
  const [session, current] = await Promise.all([getCurrentSession(), getCurrentTenant()]);
  if (!session || !current) return null;

  const container = createServerContainer();
  const { authContext } = session;

  const member = await container.repositories.member.findByUserId(
    authContext.tenantId,
    session.user.id,
  );

  const [announcements, events, anniversaries, documentos, biblioteca, albuns, favoritos, quotes] =
    await Promise.all([
      hasPermission(authContext, 'announcement:read')
        ? container.useCases.listActiveAnnouncements.execute(authContext.tenantId)
        : Promise.resolve([]),
      getUpcomingEventsForPortal(),
      hasPermission(authContext, 'member:read')
        ? container.useCases.listUpcomingAnniversaries.execute(authContext)
        : Promise.resolve([]),
      hasPermission(authContext, 'file:read')
        ? container.repositories.fileAsset.countByTenant(authContext.tenantId)
        : Promise.resolve(null),
      hasPermission(authContext, 'libraryItem:read')
        ? container.repositories.libraryItem.countByTenant(authContext.tenantId)
        : Promise.resolve(null),
      hasPermission(authContext, 'gallery:read')
        ? container.repositories.galleryAlbum.countByTenant(authContext.tenantId)
        : Promise.resolve(null),
      container.useCases.listMyFavorites.execute(authContext).then((items) => items.length),
      hasPermission(authContext, 'quote:read')
        ? container.useCases.listActiveInspirationalQuotes.execute(authContext)
        : Promise.resolve([]),
    ]);

  const featuredEvent = events[0] ?? null;
  const agendaEvents = events.slice(1, 4);

  const showDirectoryLink = hasPermission(authContext, 'memberDirectory:read');
  const displayName = resolveMemberDisplayName(member, session.user.email);
  const firstName = displayName.split(' ')[0];
  const hasAnniversaries = anniversaries.length > 0;
  const now = new Date();
  const greeting = timeOfDayGreeting(now);
  const dailyQuote = pickQuote(
    quotes.map((q) => ({ text: q.texto, author: q.autor })),
    current.settings?.citacaoRotacao ?? { modo: 'diaria', intervaloMinutos: null },
    now,
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="relative">
        <section className="from-primary to-primary-dark relative overflow-hidden rounded-[18px] bg-gradient-to-br px-7 pb-11 pt-7 text-white shadow-md lg:px-9">
          <div className="bg-accent/10 absolute -right-16 -top-16 h-64 w-64 rounded-full blur-3xl" />
          <div className="relative flex flex-col gap-3">
            <p className="text-accent text-xs font-semibold uppercase tracking-widest">
              {current.tenant.nome}
            </p>
            <h1 className="font-display text-3xl font-semibold leading-[1.1] sm:text-4xl">
              {greeting}. Seja bem-vindo, {firstName}
            </h1>
            <p className="max-w-xl text-sm text-white/70">
              Acompanhe a agenda, os avisos e o acervo da {current.tenant.nome} — tudo em um só
              lugar.
            </p>
          </div>
        </section>
        <div className="absolute inset-x-4 -bottom-4 sm:inset-x-6">
          <DailyQuoteCard quote={dailyQuote} />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <DashboardSectionHeading icon={Sparkles} title="Próximos da Loja" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {featuredEvent ? (
            <NextEventCard event={featuredEvent} />
          ) : (
            <Card className="shadow-none">
              <EmptyState
                icon={<CalendarDays size={22} />}
                title="Nenhuma sessão agendada"
                description="Assim que uma nova sessão for cadastrada na Agenda, ela aparece aqui em destaque."
              />
            </Card>
          )}
          <div className="flex flex-col gap-4">
            {hasAnniversaries && (
              <AnniversariesPanel entries={anniversaries} showDirectoryLink={showDirectoryLink} />
            )}
            <AvisosCard announcements={announcements} />
          </div>
        </div>
      </section>

      <AgendaPanel events={agendaEvents} />

      <AcervoPanel
        documentos={documentos}
        biblioteca={biblioteca}
        albuns={albuns}
        favoritos={favoritos}
      />
    </div>
  );
}
