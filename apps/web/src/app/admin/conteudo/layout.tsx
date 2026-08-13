import { AreaTabNav } from '@/components/layout/area-tab-nav';
import { requireSession } from '@/lib/auth/require-session';

export default async function ConteudoLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AreaTabNav area="conteudo" authContext={session.authContext} />
      {children}
    </div>
  );
}
