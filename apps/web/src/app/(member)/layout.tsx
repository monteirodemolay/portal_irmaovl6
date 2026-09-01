import { redirect } from 'next/navigation';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { DEFAULT_LOCALE } from '@vl6/shared';
import { AppShell } from '@/components/layout/app-shell';
import { buildNavSections } from '@/components/layout/nav-items';
import { SidebarBrand } from '@/components/layout/sidebar-brand';
import { SidebarInstitutionalLink } from '@/components/layout/sidebar-institutional-link';
import { TopbarUser } from '@/components/layout/topbar-user';
import { getUpcomingEventsForPortal } from '@/lib/agenda/get-upcoming-events';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { roleDisplayLabel } from '@/lib/auth/role-display-label';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { resolveMemberDisplayName } from '@/lib/membership/resolve-display-name';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { AgendaProvider } from '@/modules/agenda/components/agenda-provider';
import { MemberProfileProvider } from '@/modules/central/components/directorio/member-profile-provider';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/login');
  }

  const container = createServerContainer();
  const [notificationsPage, unreadCount, current, member, agendaEvents] = await Promise.all([
    container.useCases.listMyNotifications.execute(session.authContext, { limit: 20 }),
    container.repositories.notification.countUnreadByRecipient(
      session.authContext.tenantId,
      session.authContext.uid,
    ),
    getCurrentTenant(),
    container.repositories.member.findByUserId(session.authContext.tenantId, session.user.id),
    getUpcomingEventsForPortal(),
  ]);

  const dictionary = getDictionary(current?.locale ?? DEFAULT_LOCALE);
  const tenantName = current?.tenant.nome ?? 'Portal do Irmão';
  const displayName = resolveMemberDisplayName(member, session.user.email);
  const canManageEvents = hasPermission(session.authContext, 'event:manage');

  return (
    <AgendaProvider events={agendaEvents} canManageEvents={canManageEvents}>
      <MemberProfileProvider>
        <AppShell
          brand={
            <SidebarBrand
              crestUrl={current?.branding.brasaoUrl ?? null}
              title="Portal do Irmão"
              subtitle={tenantName}
            />
          }
          sections={buildNavSections(session.authContext, session.role, dictionary, unreadCount)}
          sidebarFooter={
            current?.tenant.site && (
              <SidebarInstitutionalLink siteUrl={current.tenant.site} tenantName={tenantName} />
            )
          }
          topbarLeft={
            <div className="hidden leading-tight sm:block">
              <p className="text-muted text-[11px] font-medium uppercase tracking-wide">
                Área Restrita
              </p>
              <p className="font-display truncate text-sm font-semibold">{tenantName}</p>
            </div>
          }
          topbarRight={
            <TopbarUser
              displayName={displayName}
              fotoUrl={member?.fotoUrl ?? null}
              roleLabel={roleDisplayLabel(session.role)}
              email={session.user.email}
              grau={member?.grau ?? null}
              memberId={member?.id ?? null}
              notifications={notificationsPage.items}
              unreadCount={unreadCount}
            />
          }
        >
          {children}
        </AppShell>
      </MemberProfileProvider>
    </AgendaProvider>
  );
}
