import Link from 'next/link';
import { hasPermission } from '@vl6/domain';
import type { PermissionKey } from '@vl6/shared';
import { Avatar, AvatarFallback } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { LogoutButton } from '@/modules/identity-access/components/logout-button';

interface AdminNavItem {
  href: string;
  label: string;
  permission: PermissionKey;
}

const NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', permission: 'tenant:read' },
  { href: '/admin/loja', label: 'Gestão da Loja', permission: 'branding:read' },
  { href: '/admin/irmaos', label: 'Cadastro de Irmãos', permission: 'member:read' },
  { href: '/admin/gestoes', label: 'Gestões / Diretoria', permission: 'boardTerm:read' },
  { href: '/admin/usuarios', label: 'Usuários', permission: 'user:read' },
  { href: '/admin/permissoes', label: 'Permissões', permission: 'role:read' },
  { href: '/admin/avisos', label: 'Avisos', permission: 'announcement:read' },
  { href: '/admin/noticias', label: 'Notícias', permission: 'news:read' },
  { href: '/admin/arquivos', label: 'Arquivos', permission: 'file:read' },
  { href: '/admin/biblioteca', label: 'Biblioteca', permission: 'libraryItem:read' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, current] = await Promise.all([requireSession(), getCurrentTenant()]);
  const visibleItems = NAV_ITEMS.filter((item) =>
    hasPermission(session.authContext, item.permission),
  );
  const initials = session.user.email.slice(0, 2).toUpperCase();

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="border-border bg-surface flex flex-col border-r">
        <div className="border-border border-b px-5 py-4">
          <p className="font-display text-sm font-semibold">
            {current?.tenant.nome ?? 'Portal do Irmão'}
          </p>
          <p className="text-muted text-xs">Painel Administrativo</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-foreground hover:bg-background rounded px-3 py-2 text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-border flex items-center gap-2 border-t p-3">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="text-muted flex-1 truncate text-xs">{session.user.email}</span>
          <LogoutButton />
        </div>
      </aside>
      <main className="overflow-y-auto p-8">{children}</main>
    </div>
  );
}
