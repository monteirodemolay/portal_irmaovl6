import { notFound } from 'next/navigation';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

export default async function ContactPage() {
  const current = await getCurrentTenant();
  if (!current) notFound();
  const { tenant } = current;

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold">Contato</h1>
      <dl className="flex flex-col gap-3 text-sm">
        {tenant.email && (
          <div>
            <dt className="text-muted font-mono text-xs uppercase">E-mail</dt>
            <dd>{tenant.email}</dd>
          </div>
        )}
        {tenant.telefone && (
          <div>
            <dt className="text-muted font-mono text-xs uppercase">Telefone</dt>
            <dd>{tenant.telefone}</dd>
          </div>
        )}
        {tenant.whatsapp && (
          <div>
            <dt className="text-muted font-mono text-xs uppercase">WhatsApp</dt>
            <dd>{tenant.whatsapp}</dd>
          </div>
        )}
        {tenant.endereco && (
          <div>
            <dt className="text-muted font-mono text-xs uppercase">Endereço</dt>
            <dd>
              {tenant.endereco.logradouro}, {tenant.endereco.numero} — {tenant.endereco.bairro},{' '}
              {tenant.endereco.cidade}/{tenant.endereco.estado}
            </dd>
          </div>
        )}
      </dl>
    </main>
  );
}
