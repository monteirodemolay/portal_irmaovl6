import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@vl6/ui';
import { createServerContainer } from '@vl6/infra';
import { DEFAULT_LOCALE } from '@vl6/shared';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { revokeApiKeyAction } from '@/modules/identity-access/actions/api-key-actions';
import { CreateApiKeyForm } from '@/modules/identity-access/components/create-api-key-form';

export default async function IntegrationsPage() {
  const [session, current] = await Promise.all([
    requirePagePermission('tenant:manage'),
    getCurrentTenant(),
  ]);
  const locale = current?.locale ?? DEFAULT_LOCALE;
  const dictionary = getDictionary(locale);
  const t = dictionary.integrations;
  const container = createServerContainer();
  const apiKeys = await container.useCases.listApiKeys.execute(session.authContext);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">{t.pageTitle}</h1>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{t.newKeyCardTitle}</CardTitle>
          <CardDescription>
            {t.newKeyCardDescriptionPrefix}{' '}
            <a href="/api/v1/docs" className="underline">
              {t.newKeyCardDescriptionLink}
            </a>{' '}
            (docs/architecture/07 §7.5) {t.newKeyCardDescriptionSuffix}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateApiKeyForm availablePermissions={session.authContext.permissions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.issuedKeysTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <p className="text-muted text-sm">{t.noKeysYet}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">
                    {t.tableName}
                  </th>
                  <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">
                    {t.tablePrefix}
                  </th>
                  <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">
                    {t.tableLastUsed}
                  </th>
                  <th className="text-muted px-4 py-3 text-left font-mono text-xs uppercase">
                    {t.tableStatus}
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
                        {apiKey.ultimoUso ? apiKey.ultimoUso.toLocaleString(locale) : t.never}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={revogada ? 'destructive' : 'success'}>
                          {revogada ? t.revoked : t.active}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!revogada && (
                          <form action={revoke}>
                            <Button type="submit" variant="ghost" size="sm">
                              {t.revokeButton}
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
