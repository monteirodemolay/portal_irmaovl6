import { Suspense } from 'react';
import { DEFAULT_LOCALE } from '@vl6/shared';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { LoginForm } from '@/modules/identity-access/components/login-form';

export default async function LoginPage() {
  const current = await getCurrentTenant();
  const dictionary = getDictionary(current?.locale ?? DEFAULT_LOCALE);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold">
          {current?.tenant.nome ?? 'Portal do Irmão'}
        </h1>
        <p className="text-muted mt-1 text-sm">{dictionary.login.subtitle}</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
