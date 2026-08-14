import Link from 'next/link';
import { hasPermission } from '@vl6/domain';
import { Button, Sparkles } from '@vl6/ui';
import { createServerContainer } from '@vl6/infra';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { roleDisplayLabel } from '@/lib/auth/role-display-label';
import { resolveMemberDisplayName } from '@/lib/membership/resolve-display-name';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';
import { AcervoPanel } from '@/modules/dashboard/components/acervo-panel';
import { AgendaPanel } from '@/modules/dashboard/components/agenda-panel';
import { AnniversariesPanel } from '@/modules/dashboard/components/anniversaries-panel';
import { AvisosPanel } from '@/modules/dashboard/components/avisos-panel';
import { DashboardSectionHeading } from '@/modules/dashboard/components/dashboard-section-heading';
import { ImportantNoticeCard } from '@/modules/dashboard/components/important-notice-card';
import { NextEventCard } from '@/modules/dashboard/components/next-event-card';
import { QuickAccessPanel } from '@/modules/dashboard/components/quick-access-panel';

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
    upcomingEventsPage,
    anniversaries,
    documentos,
    biblioteca,
    albuns,
    favoritos,
  ] = await Promise.all([
    hasPermission(authContext, 'announcement:read')
      ? container.useCases.listActiveAnnouncements.execute(authContext.tenantId)
      : Promise.resolve([]),
    hasPermission(authContext, 'event:read')
      ? container.useCases.listUpcomingEvents.execute(authContext, { limit: 4 })
      : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
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
  ]);

  const events = upcomingEventsPage.items;
  const featuredEvent = events[0] ?? null;
  const agendaEvents = events.slice(1, 4);

  const importantNotice =
    announcements.find((a) => a.prioridade === 'alta') ??
    announcements.find((a) => a.destacar) ??
    null;
  const avisosList = importantNotice
    ? announcements.filter((a) => a.id !== importantNotice.id)
    : announcements;

  const showDirectoryLink = hasPermission(authContext, 'memberDirectory:read');
  const displayName = resolveMemberDisplayName(member, session.user.email);

  return (
    <div className="flex flex-col gap-8">
      <section className="from-primary to-primary-dark relative grid gap-6 overflow-hidden rounded-[18px] bg-gradient-to-br px-7 py-8 text-white shadow-md lg:grid-cols-[1.35fr_0.65fr] lg:px-9 lg:py-9">
        <div className="bg-accent/10 absolute -right-16 -top-16 h-64 w-64 rounded-full blur-3xl" />
        <div className="relative flex flex-col justify-center gap-3">
          <p className="text-accent text-xs font-semibold uppercase tracking-widest">
            {current.tenant.nome}
          </p>
          <h1 className="font-display text-3xl font-semibold leading-[1.1] sm:text-4xl">
            Bem-vindo ao Portal do Irmão
          </h1>
          <p className="max-w-xl text-sm text-white/70">
            Um ambiente reservado para acompanhar os conteúdos, avisos, eventos, documentos e
            informações da {current.tenant.nome}.
          </p>
        </div>

        <div className="relative flex items-center gap-4 self-center rounded-[14px] border border-white/15 bg-white/[0.08] p-4 backdrop-blur-sm">
          <MemberAvatar
            fotoUrl={member?.fotoUrl ?? null}
            nome={displayName}
            className="h-14 w-14 shrink-0 ring-2 ring-white/20"
          />
          <div className="min-w-0">
            <p className="font-display truncate text-lg font-semibold text-white">{displayName}</p>
            <p className="truncate text-xs text-white/70">
              {roleDisplayLabel(session.role)} · {current.tenant.nome}
            </p>
            {member && (
              <div className="mt-2">
                <MemberDegreeBadge grau={member.grau} compact />
              </div>
            )}
            <Button asChild variant="accent" size="sm" className="mt-2.5">
              <Link href="/perfil">Ver meu perfil</Link>
            </Button>
          </div>
        </div>
      </section>

      {(featuredEvent || importantNotice) && (
        <section className="flex flex-col gap-3">
          <DashboardSectionHeading icon={Sparkles} title="Próximos da Loja" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {featuredEvent && <NextEventCard event={featuredEvent} />}
            {importantNotice && <ImportantNoticeCard announcement={importantNotice} />}
          </div>
        </section>
      )}

      <AnniversariesPanel entries={anniversaries} showDirectoryLink={showDirectoryLink} />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgendaPanel events={agendaEvents} />
        <AvisosPanel announcements={avisosList} />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <QuickAccessPanel showDirectoryLink={showDirectoryLink} />
        <AcervoPanel
          documentos={documentos}
          biblioteca={biblioteca}
          albuns={albuns}
          favoritos={favoritos}
        />
      </section>
    </div>
  );
}
