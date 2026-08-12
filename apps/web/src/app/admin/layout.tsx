import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission, type Role } from '@vl6/domain';
import { DEFAULT_LOCALE, type PermissionKey } from '@vl6/shared';
import { Avatar, AvatarFallback } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { getDictionary, type Dictionary } from '@/lib/i18n/get-dictionary';
import { LogoutButton } from '@/modules/identity-access/components/logout-button';

interface AdminNavItem {
  href: string;
  labelKey: keyof Dictionary['nav'];
  permission: PermissionKey;
}

const NAV_ITEMS: AdminNavItem[] = [
  { href: '/admin', labelKey: 'dashboard', permission: 'tenant:read' },
  { href: '/admin/loja', labelKey: 'storeManagement', permission: 'branding:read' },
  { href: '/admin/irmaos', labelKey: 'memberRegistry', permission: 'member:read' },
  { href: '/admin/gestoes', labelKey: 'boards', permission: 'boardTerm:read' },
  { href: '/admin/usuarios', labelKey: 'users', permission: 'user:read' },
  { href: '/admin/permissoes', labelKey: 'permissions', permission: 'role:read' },
  { href: '/admin/avisos', labelKey: 'announcements', permission: 'announcement:read' },
  { href: '/admin/noticias', labelKey: 'news', permission: 'news:read' },
  { href: '/admin/arquivos', labelKey: 'files', permission: 'file:read' },
  { href: '/admin/biblioteca', labelKey: 'library', permission: 'libraryItem:read' },
  { href: '/admin/agenda', labelKey: 'agenda', permission: 'event:read' },
  { href: '/admin/galeria', labelKey: 'gallery', permission: 'gallery:read' },
  { href: '/admin/integracoes', labelKey: 'integrations', permission: 'tenant:manage' },
  { href: '/admin/configuracoes', labelKey: 'settings', permission: 'tenant:read' },
];

/**
 * `/admin/*` é reservado a Administrador da Loja e Administrador Geral —
 * um Membro nunca deveria enxergar nada aqui, mesmo digitando a URL
 * direto. Checar só permissão por recurso não bastava: o papel `membro`
 * tem várias permissões `:read` (as mesmas que sustentam a leitura na
 * Área do Irmão), então sem este gate ele conseguiria ler boa parte do
 * painel administrativo — só não conseguiria escrever. Mesmo critério de
 * "papel de administração" usado em `resolvePostLoginDestination`.
 */
function isAdminTier(role: Role | null): boolean {
  if (!role) return false;
  if (role.sistemico) return role.chave === 'admin' || role.chave === 'super_admin';
  return role.permissoes.some((permission) => !permission.endsWith(':read'));
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, current] = await Promise.all([requireSession(), getCurrentTenant()]);
  if (!isAdminTier(session.role)) {
    notFound();
  }

  const visibleItems = NAV_ITEMS.filter((item) =>
    hasPermission(session.authContext, item.permission),
  );
  const initials = session.user.email.slice(0, 2).toUpperCase();
  const dictionary = getDictionary(current?.locale ?? DEFAULT_LOCALE);

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="border-border bg-surface flex flex-col border-r">
        <div className="border-border border-b px-5 py-4">
          <p className="font-display text-sm font-semibold">
            {current?.tenant.nome ?? 'Portal do Irmão'}
          </p>
          <p className="text-muted text-xs">{dictionary.nav.adminPanelTitle}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-foreground hover:bg-background rounded px-3 py-2 text-sm"
            >
              {dictionary.nav[item.labelKey]}
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
