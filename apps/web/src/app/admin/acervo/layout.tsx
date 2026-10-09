import { ArchiveAdminNav } from '@/components/layout/archive-admin-nav';
import { requireSession } from '@/lib/auth/require-session';

export default async function AcervoLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ArchiveAdminNav authContext={session.authContext} role={session.role} />
      {children}
    </div>
  );
}
