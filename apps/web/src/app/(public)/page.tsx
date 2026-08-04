import Link from 'next/link';
import { Button } from '@vl6/ui';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

export default async function HomePage() {
  const current = await getCurrentTenant();
  if (!current) return null;

  const { tenant } = current;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      {tenant.dominio === null && (
        <span className="border-border text-muted rounded-sm border px-3 py-1 font-mono text-xs">
          Ambiente de desenvolvimento — subdomínio {tenant.subdominio}
        </span>
      )}
      <h1 className="font-display text-balance text-4xl font-semibold">{tenant.nome}</h1>
      <p className="text-muted max-w-xl">
        Loja nº {tenant.numero} — {tenant.potencia}. O site institucional completo (história,
        diretoria pública, galeria e notícias) chega nas próximas versões — ver
        docs/architecture/10-roadmap.md.
      </p>
      <Button asChild>
        <Link href="/login">Área do Irmão</Link>
      </Button>
    </main>
  );
}
