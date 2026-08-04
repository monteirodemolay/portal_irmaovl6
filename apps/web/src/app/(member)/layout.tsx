import { redirect } from 'next/navigation';
import { Avatar, AvatarFallback } from '@vl6/ui';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { LogoutButton } from '@/modules/identity-access/components/logout-button';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/login');
  }

  const initials = session.user.email.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="border-border flex items-center justify-between border-b px-6 py-3">
        <span className="font-display text-lg font-semibold">Portal do Irmão</span>
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
