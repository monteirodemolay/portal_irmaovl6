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
import { CentralAvisosCard } from '@/modules/dashboard/components/central-avisos-card';
import { DailyQuoteCard } from '@/modules/dashboard/components/daily-quote-card';
import { GovernanceHighlightCard } from '@/modules/dashboard/components/governance-highlight-card';
import { NewsHighlights } from '@/modules/dashboard/components/news-highlights';
import { NextLodgeEventCard } from '@/modules/dashboard/components/next-lodge-event-card';
import { NextSessionCard } from '@/modules/dashboard/components/next-session-card';
import { OnThisDayCard } from '@/modules/dashboard/components/on-this-day-card';
import { UpcomingEventsPanel } from '@/modules/dashboard/components/upcoming-events-panel';
import { timeOfDayGreeting } from '@/modules/dashboard/lib/greeting';
import { pickQuote } from '@/modules/dashboard/lib/masonic-quotes';
import { findOnThisDayArchiveItem } from '@/modules/archive/lib/find-on-this-day-archive-item';

const NEWS_HOME_LIMIT = 3;

export default async function DashboardPage() {
  const [session, current] = await Promise.all([getCurrentSession(), getCurrentTenant()]);
  if (!session || !current) return null;

  const container = createServerContainer();
  const { authContext } = session;

  const member = await container.repositories.member.findByUserId(
    authContext.tenantId,
    session.user.id,
  );

  const [
    announcements,
    notificationsPage,
    events,
    anniversaries,
    documentos,
    biblioteca,
    albuns,
    favoritos,
    quotes,
    onThisDay,
    activeBoard,
    newsPage,
  ] = await Promise.all([
    hasPermission(authContext, 'announcement:read')
      ? container.useCases.listActiveAnnouncements.execute(authContext.tenantId)
      : Promise.resolve([]),
    container.useCases.listMyNotifications.execute(authContext, { limit: 20 }),
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
    findOnThisDayArchiveItem(container, authContext, session.role),
    hasPermission(authContext, 'boardTerm:read')
      ? container.useCases.getActiveBoard.execute(authContext)
      : Promise.resolve(null),
    container.useCases.listPublishedNews.execute(authContext.tenantId, {
      limit: NEWS_HOME_LIMIT,
    }),
  ]);

  // "Sessão da Loja" e "Evento da Loja" nunca se misturam: a mesma
  // coleção `events` guarda os dois (campo `tipo`), então a separação
  // acontece aqui, uma única vez, antes de qualquer card renderizar —
  // ver `packages/domain/.../event.entity.ts` pro histórico do bug que
  // motivou esse filtro (`tipo === 'sessao'` vs `events[0]`).
  const upcomingSessions = events.filter((event) => event.tipo === 'sessao');
  const featuredSession = upcomingSessions[0] ?? null;
  const agendaSessions = upcomingSessions.slice(1, 3);

  const upcomingLodgeEvents = events.filter((event) => event.tipo !== 'sessao');
  const featuredLodgeEvent = upcomingLodgeEvents[0] ?? null;
  const agendaLodgeEvents = upcomingLodgeEvents.slice(1, 3);

  // Confirmação de presença em destaque no Início — antes só dava pra
  // confirmar entrando na Agenda por conta própria (docs/architecture,
  // achado da auditoria de navegação/retenção).
  const featuredSessionAttendance =
    featuredSession?.exigeConfirmacaoPresenca && member
      ? await container.repositories.eventAttendance.findByEventAndMember(
          featuredSession.id,
          member.id,
        )
      : null;

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
      {/* 1. Cabeçalho / saudação — hero institucional compacto com a
          Gestão vigente sobreposta e a frase do dia numa faixa discreta
          logo abaixo, sem dominar o layout. */}
      <div>
        <section className="from-primary to-primary-dark relative overflow-hidden rounded-[18px] bg-gradient-to-br px-7 pb-11 pt-7 text-white shadow-md lg:px-9">
          <div className="bg-accent/10 absolute -right-16 -top-16 h-64 w-64 rounded-full blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3">
              <p className="text-accent text-xs font-semibold uppercase tracking-widest">
                {greeting}
              </p>
              <h1 className="font-display text-3xl font-semibold leading-[1.1] sm:text-4xl">
                Ir∴ {firstName}
              </h1>
              <p className="max-w-xl text-sm text-white/70">
                Acompanhe a agenda, os avisos e o acervo da {current.tenant.nome} — tudo em um só
                lugar.
              </p>
            </div>
            <GovernanceHighlightCard board={activeBoard} />
          </div>
        </section>
        {/* Fica no fluxo normal (não absolute) — só puxado pra cima o
            suficiente pra sobrepor a borda inferior do banner, dentro da
            área em branco reservada por pb-11 acima. Se a frase crescer
            (2-3 linhas), o card só empurra o restante da página pra baixo,
            nunca cobre o texto do banner. */}
        <div className="relative z-10 -mt-6 px-4 sm:px-6">
          <DailyQuoteCard quote={dailyQuote} />
        </div>
      </div>

      {/* 2-3. Próxima Sessão da Loja + Próximo Evento da Loja, lado a
          lado em telas largas — cada card só mostra dados do seu próprio
          tipo, nunca misturados. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {featuredSession ? (
          <NextSessionCard
            event={featuredSession}
            attendanceStatus={featuredSessionAttendance?.statusPresenca ?? null}
          />
        ) : (
          <Card className="shadow-none">
            <EmptyState
              icon={<CalendarDays size={22} />}
              title="Nenhuma sessão agendada"
              description="Assim que uma nova sessão for cadastrada na Agenda, ela aparece aqui em destaque."
            />
          </Card>
        )}
        {featuredLodgeEvent ? (
          <NextLodgeEventCard event={featuredLodgeEvent} />
        ) : (
          <Card className="shadow-none">
            <EmptyState
              icon={<Sparkles size={22} />}
              title="Nenhum evento programado"
              description="Cursos, palestras e confraternizações aparecem aqui assim que forem cadastrados na Agenda."
            />
          </Card>
        )}
      </div>

      {/* 4-6. Próximas Sessões, Próximos Eventos e Avisos Importantes na
          mesma faixa, sempre em listas próprias — nunca a mesma lista
          filtrada duas vezes. Só cabem os 3 lado a lado a partir de `xl`
          (>=1280px, "desktop grande"); no notebook menor (`lg`, 1024-1279px)
          os cabeçalhos dos cards (título + link de ação) ficam espremidos
          numa coluna de 1/3 — Avisos desce pra uma segunda linha em vez de
          cortar o texto. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <AgendaPanel events={agendaSessions} />
        <UpcomingEventsPanel events={agendaLodgeEvents} />
        <div className="flex flex-col gap-4 lg:col-span-2 xl:col-span-1">
          <AvisosCard announcements={announcements} />
          <CentralAvisosCard notifications={notificationsPage.items} />
        </div>
      </div>

      {onThisDay && <OnThisDayCard entry={onThisDay} />}
      {hasAnniversaries && (
        <AnniversariesPanel entries={anniversaries} showDirectoryLink={showDirectoryLink} />
      )}

      {/* 7. Acontece na Verdadeira Luz — módulo editorial de Notícias. */}
      <NewsHighlights news={newsPage.items} />

      {/* 8-9. Acervo VL6 + Constelação da Memória (bloco discreto, não
          mais uma categoria do Acervo). */}
      <AcervoPanel
        documentos={documentos}
        biblioteca={biblioteca}
        albuns={albuns}
        favoritos={favoritos}
        showConstellation={hasPermission(authContext, 'archiveRelation:read')}
      />
    </div>
  );
}
