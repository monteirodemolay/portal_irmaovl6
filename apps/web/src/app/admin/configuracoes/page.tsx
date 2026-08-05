import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { MfaEnrollmentPanel } from '@/modules/identity-access/components/mfa-enrollment-panel';

export default async function AdminSettingsPage() {
  await requireSession();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Configurações</h1>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Verificação em duas etapas (MFA)</CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta com um código gerado por app
            autenticador (TOTP), além da senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MfaEnrollmentPanel />
        </CardContent>
      </Card>
    </div>
  );
}
