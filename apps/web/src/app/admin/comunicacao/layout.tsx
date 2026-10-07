import { requireSession } from '@/lib/auth/require-session';
import { EditorialNav } from '@/components/layout/editorial-nav';
export default async function CommunicationLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <EditorialNav authContext={session.authContext} role={session.role} />
      {children}
    </div>
  );
}
