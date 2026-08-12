import { Suspense } from 'react';
import { ArrowLeft, Compass } from '@vl6/ui';
import { DEFAULT_LOCALE } from '@vl6/shared';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { LoginForm } from '@/modules/identity-access/components/login-form';

/**
 * Porta de entrada visual do Portal (docs/architecture/07 §7.0) — sem
 * landing page pública antes dela. Identidade institucional à esquerda
 * (marca real da Loja, nunca hardcoded), formulário à direita. O link de
 * volta usa `Tenant.site` — nunca uma URL fixa no código.
 */
export default async function LoginPage() {
  const current = await getCurrentTenant();
  const dictionary = getDictionary(current?.locale ?? DEFAULT_LOCALE);
  const tenant = current?.tenant;
  const branding = current?.branding;

  return (
    <main className="bg-background grid min-h-screen lg:grid-cols-2">
      <section className="from-primary to-primary-dark relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br p-12 text-white lg:flex">
        <div className="bg-accent/10 absolute -right-24 -top-24 h-96 w-96 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          {branding?.brasaoUrl ? (
            <img src={branding.brasaoUrl} alt="" className="h-14 w-14 object-contain" />
          ) : (
            <span className="bg-accent/15 text-accent flex h-14 w-14 items-center justify-center rounded-full">
              <Compass size={28} strokeWidth={1.75} />
            </span>
          )}
          <span className="font-display text-lg font-semibold">Portal do Irmão</span>
        </div>

        <div className="relative flex flex-col gap-3">
          <h1 className="font-display text-4xl font-semibold leading-[1.1]">
            {tenant?.nome ?? 'Portal do Irmão'}
          </h1>
          {tenant && (
            <p className="text-white/70">
              Loja nº {tenant.numero} — {tenant.potencia}
            </p>
          )}
        </div>

        <div className="relative">
          {tenant?.site && (
            <a
              href={tenant.site}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
            >
              <ArrowLeft size={16} />
              {dictionary.login.visitInstitutionalSite}
            </a>
          )}
        </div>
      </section>

      <section className="flex flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="flex w-full max-w-sm flex-col gap-2 lg:hidden">
          {branding?.brasaoUrl ? (
            <img src={branding.brasaoUrl} alt="" className="mx-auto h-14 w-14 object-contain" />
          ) : (
            <span className="bg-accent/15 text-accent mx-auto flex h-14 w-14 items-center justify-center rounded-full">
              <Compass size={28} strokeWidth={1.75} />
            </span>
          )}
        </div>

        <div className="w-full max-w-sm text-center">
          <p className="text-accent text-xs font-semibold uppercase tracking-widest">
            {dictionary.login.accessRestricted}
          </p>
          <h2 className="font-display mt-1 text-2xl font-semibold">
            {tenant?.nome ?? 'Portal do Irmão'}
          </h2>
          <p className="text-muted mt-1 text-sm">{dictionary.login.subtitle}</p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>

        {tenant?.site && (
          <a
            href={tenant.site}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-foreground inline-flex items-center gap-1.5 text-sm lg:hidden"
          >
            <ArrowLeft size={14} />
            {dictionary.login.visitInstitutionalSite}
          </a>
        )}
      </section>
    </main>
  );
}
