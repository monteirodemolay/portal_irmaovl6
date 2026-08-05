import { createServerContainer } from '@vl6/infra';
import { Badge, Card, CardContent, CardHeader, CardTitle, Select } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { assignRoleAction } from '@/modules/identity-access/actions/user-actions';
import { InviteUserForm } from '@/modules/identity-access/components/invite-user-form';

export default async function UsersPage() {
  const session = await requirePagePermission('user:read');

  const container = createServerContainer();
  const [users, roles] = await Promise.all([
    container.useCases.listUsers.execute(session.authContext),
    container.useCases.listRoles.execute(session.authContext),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl font-semibold">Usuários</h1>

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Convidar usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteUserForm roles={roles} />
        </CardContent>
      </Card>

      <div className="border-border bg-surface overflow-x-auto rounded-lg border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">E-mail</th>
              <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">Status</th>
              <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">Papel</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const boundAssignRole = assignRoleAction.bind(null, user.id);
              return (
                <tr key={user.id} className="border-border border-b last:border-0">
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.statusConta === 'active' ? 'success' : 'warning'}>
                      {user.statusConta}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <form action={boundAssignRole} className="flex items-center gap-2">
                      <Select name="roleId" defaultValue={user.roleId} className="h-8 text-xs">
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.nome}
                          </option>
                        ))}
                      </Select>
                      <button type="submit" className="text-primary text-xs underline">
                        salvar
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
