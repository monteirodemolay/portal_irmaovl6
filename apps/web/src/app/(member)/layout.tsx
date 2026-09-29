import { headers } from 'next/headers';
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
import { getLegalAcceptanceStatus } from '@/lib/legal/get-legal-acceptance-status';
import { LEGAL_DOCUMENT_SLUGS, LEGAL_DOCUMENT_TITLES } from '@/lib/legal/document-slug';
import { AgendaProvider } from '@/modules/agenda/components/agenda-provider';
import {
  FirstAccessWelcomeOverlay,
  type PendingLegalDoc,
} from '@/modules/legal/components/first-access-welcome-overlay';
import { PATHNAME_HEADER } from '@/middleware';

const TERMOS_E_PRIVACIDADE_PATH = '/irmaos/configuracoes/termos-e-privacidade';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/login');
  }

  const container = createServerContainer();

  // Gate de reaceite obrigatório (docs/legal/04-sistema-de-versionamento.md
  // §4) — na própria página de aceite (`/irmaos/configuracoes/termos-e-privacidade`)
  // não mostra o overlay por cima, pra não duplicar a mesma ação: essa página
  // já tem seu próprio cartão de aceite.
  const headerList = await headers();
  const pathname = headerList.get(PATHNAME_HEADER) ?? '';
  const isOnTermosPage = pathname.startsWith(TERMOS_E_PRIVACIDADE_PATH);

  const legalStatus = isOnTermosPage ? [] : await getLegalAcceptanceStatus(session.authContext);
  const pendingStatuses = legalStatus.filter((doc) => doc.pendente);

  let pendingDocs: PendingLegalDoc[] = [];
  if (pendingStatuses.length > 0) {
    const versions = await Promise.all(
      pendingStatuses.map((status) =>
        container.useCases.listLegalDocumentVersions.execute(session.authContext, status.documento),
      ),
    );
    pendingDocs = pendingStatuses.map((status, index) => {
      const result = versions[index];
      const vigente = result?.ok ? result.value[0] : undefined;
      return {
        documento: status.documento,
        titulo: LEGAL_DOCUMENT_TITLES[status.documento],
        versao: status.versaoVigente ?? vigente?.versao ?? '',
        diffResumo: vigente?.diffResumo ?? null,
        markdown: vigente?.conteudoMarkdown ?? '',
        slug: LEGAL_DOCUMENT_SLUGS[status.documento],
      };
    });
  }
  // Primeiro acesso de verdade (nunca aceitou nenhum dos dois documentos) tem
  // tom de boas-vindas; reaceite de uma versão atualizada tem tom mais sóbrio
  // — mesmo overlay, textos diferentes (ver `FirstAccessWelcomeOverlay`).
  const isFirstAccess = pendingStatuses.length > 0 && pendingStatuses.every((s) => !s.aceitoEm);

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
      <>
        <AppShell
          brand={
            <SidebarBrand
              crestUrl={current?.branding.brasaoUrl ?? null}
              title="Portal do Irmão"
              subtitle={tenantName}
            />
          }
          sections={buildNavSections(
            session.authContext,
            session.role,
            dictionary,
            unreadCount,
            session.user.email,
          )}
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
        {pendingDocs.length > 0 && (
          <FirstAccessWelcomeOverlay
            displayName={displayName.split(' ')[0] ?? displayName}
            pendingDocs={pendingDocs}
            isFirstAccess={isFirstAccess}
          />
        )}
      </>
    </AgendaProvider>
  );
}
