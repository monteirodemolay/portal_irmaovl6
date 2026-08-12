import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { DEFAULT_LOCALE } from '@vl6/shared';
import { AppShell } from '@/components/layout/app-shell';
import { buildNavSections } from '@/components/layout/nav-items';
import { SidebarBrand } from '@/components/layout/sidebar-brand';
import { SidebarInstitutionalLink } from '@/components/layout/sidebar-institutional-link';
import { TopbarUser } from '@/components/layout/topbar-user';
import { isAdminTier } from '@/lib/auth/is-admin-tier';
import { requireSession } from '@/lib/auth/require-session';
import { roleDisplayLabel } from '@/lib/auth/role-display-label';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { resolveMemberDisplayName } from '@/lib/membership/resolve-display-name';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (!isAdminTier(session.role)) {
    notFound();
  }

  const container = createServerContainer();
  const [notificationsPage, unreadCount, current, member] = await Promise.all([
    container.useCases.listMyNotifications.execute(session.authContext, { limit: 20 }),
    container.repositories.notification.countUnreadByRecipient(
      session.authContext.tenantId,
      session.authContext.uid,
    ),
    getCurrentTenant(),
    container.repositories.member.findByUserId(session.authContext.tenantId, session.user.id),
  ]);

  const dictionary = getDictionary(current?.locale ?? DEFAULT_LOCALE);
  const tenantName = current?.tenant.nome ?? 'Portal do Irmão';
  const displayName = resolveMemberDisplayName(member, session.user.email);

  return (
    <AppShell
      brand={
        <SidebarBrand
          crestUrl={current?.branding.brasaoUrl ?? null}
          title="Portal do Irmão"
          subtitle={tenantName}
        />
      }
      sections={buildNavSections(session.authContext, session.role, dictionary)}
      sidebarFooter={
        current?.tenant.site && (
          <SidebarInstitutionalLink siteUrl={current.tenant.site} tenantName={tenantName} />
        )
      }
      topbarLeft={
        <div className="hidden leading-tight sm:block">
          <p className="text-muted text-[11px] font-medium uppercase tracking-wide">
            {dictionary.nav.adminPanelTitle}
          </p>
          <p className="font-display truncate text-sm font-semibold">{tenantName}</p>
        </div>
      }
      topbarRight={
        <TopbarUser
          displayName={displayName}
          roleLabel={roleDisplayLabel(session.role)}
          email={session.user.email}
          notifications={notificationsPage.items}
          unreadCount={unreadCount}
        />
      }
    >
      {children}
    </AppShell>
  );
}
