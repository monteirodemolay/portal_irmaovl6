import { headers } from 'next/headers';
import { PATHNAME_HEADER } from '@/middleware';
import { EditorialNav } from '@/components/layout/editorial-nav';
import { AreaTabNav } from '@/components/layout/area-tab-nav';
import { requireSession } from '@/lib/auth/require-session';

export default async function AcervoLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? '';

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {pathname === '/admin/acervo/publicar' ? (
        <EditorialNav authContext={session.authContext} role={session.role} />
      ) : (
        <AreaTabNav area="acervo" authContext={session.authContext} />
      )}
      {children}
    </div>
  );
}
