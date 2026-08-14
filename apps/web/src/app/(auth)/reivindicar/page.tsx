import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Card, CardContent } from '@vl6/ui';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { ClaimAccountForm } from '@/modules/membership/components/claim-account-form';

/**
 * Fluxo público (sem login) pelo qual um Irmão já cadastrado — mas ainda
 * sem e-mail/senha, ex.: importado em massa de uma planilha — cria o
 * próprio acesso ao Portal. Nunca listado em `PROTECTED_PREFIXES`
 * (middleware.ts): fica público de propósito, junto de `/login`.
 */
export default async function ClaimAccountPage() {
  const current = await getCurrentTenant();

  if (!current) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="text-muted p-6 text-center text-sm">
            Não foi possível identificar sua Loja. Acesse pelo endereço do Portal enviado pela
            Secretaria.
          </CardContent>
        </Card>
      </main>
    );
  }

  const container = createServerContainer();
  const unclaimedMembers = await container.repositories.member.findUnclaimedByTenant(
    current.tenant.id,
  );

  return (
    <main className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="border-accent/25 bg-surface/95 w-full max-w-lg rounded-[26px] border p-8 shadow-md sm:p-10">
        <h1 className="font-display text-center text-2xl font-medium">Reivindicar meu cadastro</h1>
        <p className="text-muted mb-8 mt-2 text-center text-sm">
          {current.tenant.nome} — escolha seu nome, confirme sua CIM e crie seu acesso ao Portal.
        </p>

        <ClaimAccountForm unclaimedMembers={unclaimedMembers} />

        <div className="bg-border my-6 h-px" />
        <p className="text-center text-sm">
          <Link href="/login" className="text-accent font-medium hover:underline">
            Já tenho cadastro — entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
