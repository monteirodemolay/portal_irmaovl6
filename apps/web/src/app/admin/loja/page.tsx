import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { DomainVerificationPanel } from '@/modules/tenancy/components/domain-verification-panel';

export default async function TenantSettingsPage() {
  await requirePagePermission('branding:read');
  const current = await getCurrentTenant();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Gestão da Loja</h1>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Domínio customizado</CardTitle>
          <CardDescription>
            Use um domínio próprio (ex.: minhaloja.com.br) em vez do subdomínio padrão. Exige
            comprovar posse via registro DNS antes de ativar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DomainVerificationPanel currentDomain={current?.tenant.dominio ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
