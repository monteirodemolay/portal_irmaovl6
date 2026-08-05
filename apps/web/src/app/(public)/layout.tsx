import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
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
