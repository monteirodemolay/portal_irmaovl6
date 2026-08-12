import { createServerContainer } from '@vl6/infra';
import { Badge, Card, CardContent, CardHeader, CardTitle, Select } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { assignRoleAction } from '@/modules/identity-access/actions/user-actions';
import { InviteUserForm } from '@/modules/identity-access/components/invite-user-form';
import { ResetPasswordButton } from '@/modules/identity-access/components/reset-password-button';
import { ToggleUserStatusButton } from '@/modules/identity-access/components/toggle-user-status-button';
import {
  USER_STATUS_LABEL as STATUS_LABEL,
  USER_STATUS_VARIANT as STATUS_VARIANT,
} from '@/modules/identity-access/user-status-labels';

function formatLastLogin(date: Date | null): string {
  if (!date) return 'Nunca';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(date),
  );
}

export default async function UsersPage() {
  const session = await requirePagePermission('user:read');

  const container = createServerContainer();
  const [users, roles] = await Promise.all([
    container.useCases.listUsers.execute(session.authContext),
    container.useCases.listRoles.execute(session.authContext),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Usuários de Sistema</h1>
        <p className="text-muted mt-1 max-w-2xl text-sm">
          Cadastro e acesso ao Portal de um Irmão são feitos juntos em{' '}
          <span className="font-medium">Irmãos</span>. Esta tela é exceção: só para criar uma conta
          de acesso sem um cadastro de Irmão vinculado (ex.: uso técnico).
        </p>
      </div>

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle>Convidar usuário sem cadastro de Irmão</CardTitle>
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
              <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">MFA</th>
              <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">
                Último login
              </th>
              <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">Papel</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const boundAssignRole = assignRoleAction.bind(null, user.id);
              const isSelf = user.id === session.authContext.uid;
              return (
                <tr key={user.id} className="border-border border-b last:border-0">
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[user.statusConta]}>
                      {STATUS_LABEL[user.statusConta]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.mfaHabilitado ? (
                      <Badge variant="accent">Ativo</Badge>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="text-muted px-4 py-3 text-xs">
                    {formatLastLogin(user.ultimoLogin)}
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <ResetPasswordButton userId={user.id} email={user.email} />
                      {!isSelf && (
                        <ToggleUserStatusButton userId={user.id} statusConta={user.statusConta} />
                      )}
                    </div>
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
