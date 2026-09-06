import { hasPermission } from '@vl6/domain';
import { CalendarDays, Card, EmptyState } from '@vl6/ui';
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
import { DashboardSectionHeading } from '@/modules/dashboard/components/dashboard-section-heading';
import { EventsCarousel } from '@/modules/dashboard/components/events-carousel';
import { NextEventCard } from '@/modules/dashboard/components/next-event-card';
import { OnThisDayCard } from '@/modules/dashboard/components/on-this-day-card';
import { timeOfDayGreeting } from '@/modules/dashboard/lib/greeting';
import { pickQuote } from '@/modules/dashboard/lib/masonic-quotes';
import { findOnThisDayArchiveItem } from '@/modules/archive/lib/find-on-this-day-archive-item';

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
  ]);

  // "Sessões da Loja" (cartão em destaque + Agenda) só considera Eventos
  // tipo 'sessao' — antes pegava o próximo Evento de QUALQUER tipo
  // (`events[0]`), então um Evento comum (curso, palestra etc.) marcado
  // pra uma data mais próxima que a da Sessão aparecia vestido de Sessão
  // na coluna errada (bug relatado pelo Administrador).
  const upcomingSessions = events.filter((event) => event.tipo === 'sessao');
  const featuredEvent = upcomingSessions[0] ?? null;
  // Card "Próximas Sessões" mostra só 2 — o resto da Agenda fica atrás do
  // botão "mais sessões", que abre o drawer lateral com a lista completa
  // (pedido do Administrador: card menor, sem competir com o destaque
  // acima nem virar uma segunda lista longa na tela inicial).
  const agendaEvents = upcomingSessions.slice(1, 3);
  // Vitrine própria pra Eventos que não são Sessão (curso, palestra,
  // confraternização, cívico etc.) — antes só apareciam misturados na
  // lista "Agenda", sem nenhum destaque próprio como as Sessões da Loja
  // já têm em "Próximos da Loja" (achado do Administrador).
  const nonSessionEvents = events.filter((event) => event.tipo !== 'sessao');

  // Confirmação de presença em destaque no Início — antes só dava pra
  // confirmar entrando na Agenda por conta própria (docs/architecture,
  // achado da auditoria de navegação/retenção).
  const featuredEventAttendance =
    featuredEvent?.exigeConfirmacaoPresenca && member
      ? await container.repositories.eventAttendance.findByEventAndMember(
          featuredEvent.id,
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
      <div>
        <section className="from-primary to-primary-dark relative overflow-hidden rounded-[18px] bg-gradient-to-br px-7 pb-11 pt-7 text-white shadow-md lg:px-9">
          <div className="bg-accent/10 absolute -right-16 -top-16 h-64 w-64 rounded-full blur-3xl" />
          <div className="relative flex flex-col gap-3">
            <p className="text-accent text-xs font-semibold uppercase tracking-widest">
              {current.tenant.nome}
            </p>
            <h1 className="font-display text-3xl font-semibold leading-[1.1] sm:text-4xl">
              {greeting}. Bem Vindo Ir∴ {firstName}
            </h1>
            <p className="max-w-xl text-sm text-white/70">
              Acompanhe a agenda, os avisos e o acervo da {current.tenant.nome} — tudo em um só
              lugar.
            </p>
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

      {/* Duas colunas do mesmo tamanho, lado a lado — Sessões da Loja
          (Próxima sessão + Agenda) à esquerda, Eventos da Loja (banner +
          avisos) à direita. Antes disso "Próximos da Loja" misturava a
          Sessão em destaque com os avisos numa coluna estreita ao lado, e
          Eventos (não-Sessão) ficavam numa vitrine separada mais abaixo —
          pedido do Administrador pra não competirem visualmente e ficarem
          sempre no mesmo lugar, com o mesmo peso visual. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <DashboardSectionHeading icon={CalendarDays} title="Sessões da Loja" />
          {featuredEvent ? (
            <NextEventCard
              event={featuredEvent}
              attendanceStatus={featuredEventAttendance?.statusPresenca ?? null}
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
          <AgendaPanel events={agendaEvents} />
        </section>

        <section className="flex flex-col gap-4">
          <EventsCarousel events={nonSessionEvents} />
          {/* Central de Notificações + Avisos logo abaixo da vitrine de
              Eventos — antes ficavam intercaladas com "Esta semana na
              Loja"/Aniversários, o que espalhava a área de "avisos" em dois
              blocos separados na mesma coluna (achado da auditoria de UX). */}
          <CentralAvisosCard notifications={notificationsPage.items} />
          <AvisosCard announcements={announcements} />
          {onThisDay && <OnThisDayCard entry={onThisDay} />}
          {hasAnniversaries && (
            <AnniversariesPanel entries={anniversaries} showDirectoryLink={showDirectoryLink} />
          )}
        </section>
      </div>

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
