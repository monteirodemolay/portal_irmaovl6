import { createServerContainer } from '@vl6/infra';
import { Badge } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';

export default async function PermissionsPage() {
  const session = await requirePagePermission('role:read');

  const container = createServerContainer();
  const roles = await container.useCases.listRoles.execute(session.authContext);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Permissões</h1>
        <p className="text-muted">
          Matriz de permissões por papel — ver docs/architecture/08-permissoes-rbac.md.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {roles.map((role) => (
          <div key={role.id} className="border-border bg-surface rounded-lg border p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-display font-semibold">{role.nome}</h2>
              {role.sistemico && <Badge variant="outline">papel do sistema</Badge>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {role.permissoes.length === 0 ? (
                <span className="text-muted text-sm">Sem permissões.</span>
              ) : (
                role.permissoes.map((perm) => (
                  <Badge key={perm} variant="default" className="font-mono">
                    {perm}
                  </Badge>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
