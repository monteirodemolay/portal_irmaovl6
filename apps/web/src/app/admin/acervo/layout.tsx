import { AreaTabNav } from '@/components/layout/area-tab-nav';
import { requireSession } from '@/lib/auth/require-session';

export default async function AcervoLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex flex-col gap-6">
      <AreaTabNav area="acervo" authContext={session.authContext} />
      {children}
    </div>
  );
}
