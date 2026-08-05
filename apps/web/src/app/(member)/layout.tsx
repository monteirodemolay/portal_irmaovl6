import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Avatar, AvatarFallback } from '@vl6/ui';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { LogoutButton } from '@/modules/identity-access/components/logout-button';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/perfil', label: 'Meu Perfil' },
  { href: '/diretoria', label: 'Diretoria' },
  { href: '/avisos', label: 'Avisos' },
  { href: '/noticias', label: 'Notícias' },
];

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/login');
  }

  const initials = session.user.email.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="border-border flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-display text-lg font-semibold">Portal do Irmão</span>
          <nav className="flex gap-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted hover:text-foreground text-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="text-muted text-sm">{session.user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
    </div>
  );
}
