import { Suspense } from 'react';
import { BookOpen, Compass, Globe, Handshake, Lock, ShieldCheck } from '@vl6/ui';
import { DEFAULT_LOCALE } from '@vl6/shared';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { getDictionary } from '@/lib/i18n/get-dictionary';
import { LoginForm } from '@/modules/identity-access/components/login-form';

const VALUES = [
  { label: 'Tradição', description: 'que nos guia', icon: BookOpen },
  { label: 'Ética', description: 'que nos fortalece', icon: ShieldCheck },
  { label: 'Fraternidade', description: 'que nos une', icon: Handshake },
] as const;

/**
 * Porta de entrada visual do Portal (docs/architecture/07 §7.0) — sem
 * landing page pública antes dela. Identidade institucional à esquerda
 * (marca real da Loja, nunca hardcoded — `branding.brasaoUrl` continua tendo
 * prioridade; o brasão oficial em `/branding/brasao.png` só entra como
 * fallback no lugar do ícone genérico), formulário à direita. O link de
 * volta usa `Tenant.site` — nunca uma URL fixa no código.
 */
export default async function LoginPage() {
  const current = await getCurrentTenant();
  const dictionary = getDictionary(current?.locale ?? DEFAULT_LOCALE);
  const tenant = current?.tenant;
  const branding = current?.branding;
  const crestUrl = branding?.brasaoUrl ?? '/branding/brasao.png';

  return (
    <main className="bg-background grid min-h-screen lg:grid-cols-[minmax(480px,0.95fr)_minmax(480px,1.05fr)]">
      {/* ================= Painel institucional ================= */}
      <section className="from-primary via-primary to-primary-dark relative hidden flex-col items-center justify-center overflow-hidden bg-gradient-to-br px-10 py-16 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(circle_at_center,black_25%,transparent_80%)]"
        />
        <div
          aria-hidden
          className="bg-accent/10 absolute -right-24 -top-24 h-96 w-96 rounded-full blur-3xl"
        />
        <div
          aria-hidden
          className="bg-primary-dark/60 absolute -bottom-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl"
        />
        <div
          aria-hidden
          className="via-accent/60 absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent to-transparent"
        />

        <div className="absolute left-10 top-10 flex items-center gap-3">
          <span className="border-accent/40 bg-accent/10 text-accent flex h-11 w-11 items-center justify-center rounded-full border">
            <Compass size={20} strokeWidth={1.75} />
          </span>
          <span className="font-display text-base font-semibold">Portal do Irmão</span>
        </div>

        <div className="relative flex w-full max-w-lg flex-col items-center text-center">
          <div className="relative mb-7 grid h-64 w-64 place-items-center">
            <span className="bg-accent/15 absolute inset-[11%] rounded-full blur-3xl" />
            <span className="border-accent/15 absolute inset-[2%] rounded-full border" />
            <span className="border-accent/10 absolute inset-[9%] rounded-full border" />
            <span className="border-accent/5 absolute inset-[17%] rounded-full border" />
            <div className="relative z-10 h-[74%] w-[74%] overflow-hidden rounded-[22px] bg-white p-2.5 shadow-[0_20px_32px_rgba(0,0,0,0.4)]">
              <img
                src={crestUrl}
                alt={tenant ? `Brasão da ${tenant.nome}` : 'Brasão da Loja'}
                className="h-full w-full rounded-[14px] object-contain"
              />
            </div>
          </div>

          <h1 className="font-display text-4xl font-normal leading-[1.1] text-white sm:text-5xl">
            Portal do <span className="text-accent">Irmão</span>
          </h1>

          <div className="text-accent my-4 flex w-full max-w-[280px] items-center gap-3">
            <span className="via-accent/70 h-px flex-1 bg-gradient-to-r from-transparent to-transparent" />
            <span className="border-accent h-2 w-2 rotate-45 border" />
            <span className="via-accent/70 h-px flex-1 bg-gradient-to-l from-transparent to-transparent" />
          </div>

          <p className="text-[11px] uppercase tracking-[0.25em] text-white/60">
            Área restrita da Loja Maçônica
          </p>
          <strong className="text-accent mt-1.5 block text-xs font-medium uppercase tracking-[0.27em]">
            {tenant?.nome ?? 'Verdadeira Luz nº 06'}
          </strong>
          {tenant && (
            <p className="mt-1 text-[11px] text-white/40">
              Loja nº {tenant.numero} — {tenant.potencia}
            </p>
          )}

          <div className="mt-11 grid w-full max-w-md grid-cols-3">
            {VALUES.map((value, index) => (
              <div
                key={value.label}
                className={`flex items-center gap-3 px-4 text-left ${index > 0 ? 'border-l border-white/10' : ''}`}
              >
                <span className="border-accent/25 bg-accent/[0.04] text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border">
                  <value.icon size={17} strokeWidth={1.5} />
                </span>
                <div>
                  <strong className="font-display block text-sm font-medium text-white/95">
                    {value.label}
                  </strong>
                  <small className="block text-[10px] text-white/45">{value.description}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= Painel de acesso ================= */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-16 sm:px-10">
        <div
          aria-hidden
          className="border-primary/5 absolute -bottom-52 -right-52 hidden h-[560px] w-[560px] rounded-full border lg:block"
        />

        <div className="mb-8 flex w-full max-w-sm flex-col items-center gap-2 text-center lg:hidden">
          <img src={crestUrl} alt="" className="h-16 w-16 object-contain" />
          <span className="font-display text-lg font-semibold">Portal do Irmão</span>
        </div>

        <div className="border-accent/25 bg-surface/95 relative z-10 w-full max-w-[480px] rounded-[26px] border p-8 shadow-md sm:p-10">
          <div className="border-accent/30 text-accent mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border">
            <Lock size={22} strokeWidth={1.6} />
          </div>
          <div className="text-accent mb-3 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="bg-accent/40 h-px w-8" />
            {dictionary.login.accessRestricted}
            <span className="bg-accent/40 h-px w-8" />
          </div>
          <h2 className="font-display text-center text-3xl font-medium">
            {tenant?.nome ?? 'Portal do Irmão'}
          </h2>
          <p className="text-muted mb-3 mt-2 text-center text-sm">{dictionary.login.subtitle}</p>
          <p className="text-muted mb-8 text-center text-xs leading-5">
            Ambiente digital da Loja Maçônica Verdadeira Luz nº 06 para agenda, avisos,
            documentos e memória institucional.
          </p>

          <Suspense>
            <LoginForm />
          </Suspense>

          {tenant?.site && (
            <>
              <div className="bg-border my-6 h-px" />
              <a
                href={tenant.site}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border text-foreground hover:bg-background flex min-h-[47px] w-full items-center justify-center gap-2 rounded-[13px] border text-sm font-semibold transition-colors"
              >
                <Globe size={17} />
                {dictionary.login.visitInstitutionalSite}
              </a>
            </>
          )}

          <p className="text-muted mt-5 text-center text-[10px] leading-relaxed">
            Ambiente de acesso exclusivo aos membros autorizados.
          </p>
          <p className="mt-3 text-center text-xs">
            <a href="/reivindicar" className="text-accent font-medium hover:underline">
              Já é cadastrado mas ainda não tem acesso? Reivindique seu cadastro
            </a>
          </p>
        </div>

        <nav
          aria-label="Informações públicas"
          className="text-muted relative z-10 mt-6 flex max-w-[540px] flex-wrap justify-center gap-x-4 gap-y-2 text-[11px]"
        >
          <a href="/sobre-o-portal" className="hover:text-primary transition-colors">
            Sobre o Portal
          </a>
          <a href="/minha-agenda" className="hover:text-primary transition-colors">
            Minha Agenda
          </a>
          <a href="/privacidade" className="font-semibold text-primary hover:underline">
            Política de Privacidade
          </a>
          <a href="/termos-de-uso" className="hover:text-primary transition-colors">
            Termos de Uso
          </a>
          <a href="/suporte" className="hover:text-primary transition-colors">
            Suporte
          </a>
        </nav>
        <p className="text-muted relative z-10 mt-3 text-center text-[10px]">
          © 2026 Loja Maçônica Verdadeira Luz nº 06
        </p>
      </section>
    </main>
  );
}
