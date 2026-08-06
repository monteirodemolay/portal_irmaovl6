import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@vl6/ui';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { revokeApiKeyAction } from '@/modules/identity-access/actions/api-key-actions';
import { CreateApiKeyForm } from '@/modules/identity-access/components/create-api-key-form';

export default async function IntegrationsPage() {
  const session = await requirePagePermission('tenant:manage');
  const container = createServerContainer();
  const apiKeys = await container.useCases.listApiKeys.execute(session.authContext);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Integrações</h1>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Nova API Key</CardTitle>
          <CardDescription>
            Credencial para um sistema externo consumir a{' '}
            <a href="/api/v1/docs" className="underline">
              API REST pública
            </a>{' '}
            (docs/architecture/07 §7.5) sem login de usuário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateApiKeyForm availablePermissions={session.authContext.permissions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chaves emitidas</CardTitle>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <p className="text-muted text-sm">Nenhuma chave criada ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">
                    Nome
                  </th>
                  <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">
                    Prefixo
                  </th>
                  <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">
                    Último uso
                  </th>
                  <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((apiKey) => {
                  const revoke = revokeApiKeyAction.bind(null, apiKey.id);
                  const revogada = apiKey.deletedAt !== null;
                  return (
                    <tr key={apiKey.id} className="border-border border-b last:border-0">
                      <td className="px-4 py-3">{apiKey.nome}</td>
                      <td className="text-muted px-4 py-3 font-mono text-xs">
                        {apiKey.keyPrefix}…
                      </td>
                      <td className="text-muted px-4 py-3 text-xs">
                        {apiKey.ultimoUso ? apiKey.ultimoUso.toLocaleString('pt-BR') : 'Nunca'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={revogada ? 'destructive' : 'success'}>
                          {revogada ? 'Revogada' : 'Ativa'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!revogada && (
                          <form action={revoke}>
                            <Button type="submit" variant="ghost" size="sm">
                              Revogar
                            </Button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
