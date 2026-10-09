import Link from 'next/link';
import { Avatar, AvatarFallback } from '@vl6/ui';
import { AppShell } from '@/components/layout/app-shell';
import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin';
import { LogoutButton } from '@/modules/identity-access/components/logout-button';

/** Platform authentication stays independent of tenant branding and membership. */
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdmin();
  const initials = session.user.email.slice(0, 2).toUpperCase();
  return (
    <AppShell
      brand={<div><p className="font-display text-sm font-semibold text-white">Portal do Irmão</p><p className="text-xs text-white/70">Administrador Geral</p></div>}
      sections={[{ title: 'Plataforma', items: [
        { href: '/plataforma', content: 'Lojas' },
        { href: '/plataforma/lojas/nova', content: 'Nova Loja' },
      ] }]}
      sidebarFooter={<Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm text-white hover:bg-white/10">Voltar ao Portal</Link>}
      topbarLeft={<p className="text-sm font-semibold">Painel da Plataforma</p>}
      topbarRight={<><Avatar><AvatarFallback>{initials}</AvatarFallback></Avatar><span className="text-muted hidden max-w-48 truncate text-xs sm:block">{session.user.email}</span><LogoutButton /></>}
    >
      {children}
    </AppShell>
  );
}
