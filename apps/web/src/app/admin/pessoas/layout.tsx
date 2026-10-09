import { PeopleAdminNav } from '@/components/layout/people-admin-nav';
import { requireSession } from '@/lib/auth/require-session';

export default async function PessoasLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PeopleAdminNav authContext={session.authContext} role={session.role} />
      {children}
    </div>
  );
}
