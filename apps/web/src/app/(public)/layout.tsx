import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

/**
 * Apesar do nome do grupo de rotas, nada aqui é público hoje — a
 * plataforma inteira exige login (docs/architecture/07 §7.1). `/`,
 * `/nossa-loja`, `/contato`, `/diretoria` e `/noticias` continuam
 * existindo (Diretoria e Notícias também linkadas do menu do Irmão —
 * mesma tela pros dois casos), só deixaram de ser alcançáveis por quem
 * não está logado. `/offline`, a única exceção real, vive fora deste
 * grupo (`app/offline/`).
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  const current = await getCurrentTenant();
  if (!current) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader tenantName={current.tenant.nome} />
      <div className="flex-1">{children}</div>
      <PublicFooter tenant={current.tenant} />
    </div>
  );
}
