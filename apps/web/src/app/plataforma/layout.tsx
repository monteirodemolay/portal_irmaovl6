import Link from 'next/link';
import { Avatar, AvatarFallback } from '@vl6/ui';
import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin';
import { LogoutButton } from '@/modules/identity-access/components/logout-button';

const NAV_ITEMS = [
  { href: '/plataforma', label: 'Lojas' },
  { href: '/plataforma/lojas/nova', label: 'Nova Loja' },
];

/**
 * Shell do Administrador Geral (cross-tenant, docs/architecture/08 §8.3).
 * Gate único: `tenantId === PLATFORM_TENANT_ID` via `requirePlatformAdmin`
 * — nunca um Administrador de Loja. Não usa `getCurrentTenant()`: estas
 * páginas não pertencem a nenhuma Loja (ver app/layout.tsx PLATFORM_ROUTE_PREFIX).
 */
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdmin();
  const initials = session.user.email.slice(0, 2).toUpperCase();

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="border-border bg-surface flex flex-col border-r">
        <div className="border-border border-b px-5 py-4">
          <p className="font-display text-sm font-semibold">Portal do Irmão</p>
          <p className="text-muted text-xs">Administrador Geral</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV_ITEMS.map((item) => (
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
