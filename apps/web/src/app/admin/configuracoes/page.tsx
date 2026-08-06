import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@vl6/ui';
import { hasPermission } from '@vl6/domain';
import { DEFAULT_LOCALE } from '@vl6/shared';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { MfaEnrollmentPanel } from '@/modules/identity-access/components/mfa-enrollment-panel';
import { LanguageSettingsForm } from '@/modules/tenancy/components/language-settings-form';

export default async function AdminSettingsPage() {
  const session = await requireSession();
  const current = await getCurrentTenant();
  const locale = current?.locale ?? DEFAULT_LOCALE;
  const dictionary = getDictionary(locale);
  const canManageTenant = hasPermission(session.authContext, 'tenant:manage');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">{dictionary.settings.pageTitle}</h1>

      {canManageTenant && (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>{dictionary.settings.languageCardTitle}</CardTitle>
            <CardDescription>{dictionary.settings.languageCardDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSettingsForm currentLocale={locale} />
          </CardContent>
        </Card>
      )}

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
