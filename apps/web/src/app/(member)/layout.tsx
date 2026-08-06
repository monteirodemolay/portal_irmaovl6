import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { Avatar, AvatarFallback, Compass } from '@vl6/ui';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { LogoutButton } from '@/modules/identity-access/components/logout-button';
import { NotificationCenter } from '@/modules/notification/components/notification-center';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/perfil', label: 'Meu Perfil' },
  { href: '/diretoria', label: 'Diretoria' },
  { href: '/biblioteca', label: 'Biblioteca' },
  { href: '/arquivos', label: 'Arquivos' },
  { href: '/agenda', label: 'Agenda' },
  { href: '/galeria', label: 'Galeria' },
  { href: '/downloads', label: 'Downloads' },
  { href: '/links-uteis', label: 'Links Úteis' },
  { href: '/avisos', label: 'Avisos' },
  { href: '/noticias', label: 'Notícias' },
];

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/login');
  }

  const container = createServerContainer();
  const [notificationsPage, unreadCount, current] = await Promise.all([
    container.useCases.listMyNotifications.execute(session.authContext, { limit: 20 }),
    container.repositories.notification.countUnreadByRecipient(
      session.authContext.tenantId,
      session.authContext.uid,
    ),
    getCurrentTenant(),
  ]);

  const initials = session.user.email.slice(0, 2).toUpperCase();
  const crestUrl = current?.branding.brasaoUrl ?? current?.branding.logotipoUrl ?? null;

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-primary sticky top-0 z-10 shadow-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            {crestUrl ? (
              <img src={crestUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="bg-accent/15 text-accent flex h-10 w-10 items-center justify-center rounded-full">
                <Compass size={22} strokeWidth={1.75} />
              </span>
            )}
            <div className="leading-tight">
              <p className="font-display text-base font-semibold text-white">
                {current?.tenant.nome ?? 'Portal do Irmão'}
              </p>
              <p className="text-xs text-white/60">Área do Irmão</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white">
            <NotificationCenter notifications={notificationsPage.items} unreadCount={unreadCount} />
            <Avatar>
              <AvatarFallback className="bg-accent text-primary-dark">{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm text-white/70 sm:inline">{session.user.email}</span>
            <LogoutButton className="border-white/30 text-white hover:bg-white/10" />
          </div>
        </div>
        <nav className="border-t border-white/10 px-6 py-2">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-accent rounded px-3 py-1.5 text-sm text-white/75 transition-colors hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
