import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Badge, Button } from '@vl6/ui';
import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin';
import { setTenantActiveAction } from '@/modules/tenancy/actions/platform-tenant-actions';

export default async function PlatformDashboardPage() {
  const session = await requirePlatformAdmin();
  const container = createServerContainer();
  const tenants = await container.useCases.listAllTenants.execute(session.authContext);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">Lojas</h1>
        <Button asChild className="w-fit">
          <Link href="/plataforma/lojas/nova">Criar nova Loja</Link>
        </Button>
      </div>

      {tenants.length === 0 ? (
        <p className="text-muted text-sm">Nenhuma Loja cadastrada ainda.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">Nome</th>
              <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">
                Subdomínio
              </th>
              <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">
                Domínio
              </th>
              <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">
                Módulos
              </th>
              <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => {
              const toggleAction = setTenantActiveAction.bind(null, tenant.id, !tenant.ativo);
              return (
                <tr key={tenant.id} className="border-border border-b last:border-0">
                  <td className="px-4 py-3">{tenant.nome}</td>
                  <td className="text-muted px-4 py-3 font-mono text-xs">{tenant.subdominio}</td>
                  <td className="text-muted px-4 py-3 font-mono text-xs">
                    {tenant.dominio ?? '—'}
                  </td>
                  <td className="text-muted px-4 py-3 text-xs">
                    {tenant.modulosHabilitados.length}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={tenant.ativo ? 'success' : 'warning'}>
                      {tenant.ativo ? 'Ativa' : 'Suspensa'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={toggleAction}>
                      <Button type="submit" variant="ghost" size="sm">
                        {tenant.ativo ? 'Suspender' : 'Reativar'}
                      </Button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
