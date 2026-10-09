import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';

export default async function LibraryItemLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ libraryItemId: string }>;
}) {
  const session = await requirePagePermission('libraryItem:manage');
  const { libraryItemId } = await params;
  const c = createServerContainer();
  const item = await c.repositories.libraryItem.findById(libraryItemId);
  if (!item || item.tenantId !== session.authContext.tenantId || item.deletedAt) notFound();

  const base = `/admin/acervo/biblioteca/${encodeURIComponent(item.id)}`;

  return (
    <div className="grid gap-5">
      <section className="border-border bg-surface overflow-hidden rounded-2xl border">
        <div className="px-5 py-5 md:px-6">
          <p className="text-accent text-xs font-semibold uppercase tracking-[0.12em]">
            Ficha Única da obra
          </p>
          <div className="mt-1 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold">
                {item.titulo ?? 'Obra sem título'}
              </h1>
              <p className="text-muted mt-1 text-sm">
                Dados bibliográficos, exemplar físico e histórico em um único registro.
              </p>
            </div>
            <Link href="/admin/acervo/biblioteca" className="text-accent text-sm font-medium underline">
              ← Voltar ao catálogo
            </Link>
          </div>
        </div>
        <nav
          aria-label="Seções da ficha da obra"
          className="border-border flex gap-2 overflow-x-auto border-t px-4 py-3 md:px-6"
        >
          <Link
            href={`${base}/editar`}
            className="border-border hover:border-accent whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium"
          >
            Dados e exemplar
          </Link>
          <Link
            href={`${base}/historico`}
            className="border-border hover:border-accent whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium"
          >
            Histórico
          </Link>
          <Link
            href={`/admin/acervo/biblioteca/etiquetas?libraryItemId=${encodeURIComponent(item.id)}`}
            className="border-border hover:border-accent whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium"
          >
            QR e etiquetas
          </Link>
        </nav>
      </section>
      {children}
    </div>
  );
}
