import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

export default async function AboutLodgePage() {
  const current = await getCurrentTenant();
  if (!current) notFound();
  const { tenant } = current;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-16">
      <h1 className="font-display text-balance text-3xl font-semibold">{tenant.nome}</h1>
      <p className="text-muted">
        Loja nº {tenant.numero}, jurisdicionada à {tenant.potencia}.
      </p>
      {tenant.endereco && (
        <p className="text-muted text-sm">
          {tenant.endereco.logradouro}, {tenant.endereco.numero} — {tenant.endereco.bairro},{' '}
          {tenant.endereco.cidade}/{tenant.endereco.estado}
        </p>
      )}
    </main>
  );
}
