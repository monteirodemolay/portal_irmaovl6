import type { Tenant } from '@vl6/domain';

export function PublicFooter({ tenant }: { tenant: Tenant }) {
  return (
    <footer className="border-border text-muted border-t px-6 py-8 text-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-1">
        <p>
          {tenant.nome} — Loja nº {tenant.numero} — {tenant.potencia}
        </p>
        {tenant.email && <p>{tenant.email}</p>}
        <p>
          © {new Date().getFullYear()} {tenant.nome}
        </p>
      </div>
    </footer>
  );
}
