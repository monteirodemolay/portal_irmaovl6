import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { DEFAULT_LOCALE } from '@vl6/shared';
import { AppShell } from '@/components/layout/app-shell';
import Link from 'next/link';
import { ArrowLeft } from '@vl6/ui';
import { buildAdminNavSections } from '@/components/layout/admin-navigation';
import { SidebarBrand } from '@/components/layout/sidebar-brand';
import { SidebarInstitutionalLink } from '@/components/layout/sidebar-institutional-link';
import { ServerTopbarUser } from '@/components/layout/server-topbar-user';
import { isAdminPathAllowed, isAdminTier } from '@/lib/auth/is-admin-tier';
import { requireSession } from '@/lib/auth/require-session';
import { roleDisplayLabel } from '@/lib/auth/role-display-label';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { resolveMemberDisplayName } from '@/lib/membership/resolve-display-name';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { PATHNAME_HEADER } from '@/middleware';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (!isAdminTier(session.role)) {
    notFound();
  }
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? '';
  if (!isAdminPathAllowed(session.role, pathname)) {
    notFound();
  }

  const container = createServerContainer();
  const [unreadCount, current, member] = await Promise.all([
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
          title="Central de Administração"
          subtitle={tenantName}
        />
      }
      sections={buildAdminNavSections(session.authContext, session.role)}
      sidebarFooter={
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:border-white/40 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary active:bg-white/25"
          >
            <ArrowLeft size={18} aria-hidden="true" className="shrink-0" />
            <span>Voltar ao Portal</span>
          </Link>
          {current?.tenant.site && (
            <SidebarInstitutionalLink siteUrl={current.tenant.site} tenantName={tenantName} />
          )}
        </div>
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
        <ServerTopbarUser
          authContext={session.authContext}
          displayName={displayName}
          fotoUrl={member?.fotoUrl ?? null}
          roleLabel={roleDisplayLabel(session.role)}
          email={session.user.email}
          grau={member?.grau ?? null}
          memberId={member?.id ?? null}
          unreadCount={unreadCount}
        />
      }
    >
      {children}
    </AppShell>
  );
}
