import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Button, Card, CardContent } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { CreateLibraryCategoryDialog } from '@/modules/library/components/create-library-category-dialog';
import {
  LibraryCatalogBrowser,
  type CatalogRow,
} from '@/modules/library/components/library-catalog-browser';

export default async function LibraryPage() {
  const session = await requirePagePermission('libraryItem:read');

  const container = createServerContainer();
  const [categories, items, filesPage, copies, loans, occurrences] = await Promise.all([
    container.useCases.listLibraryCategories.execute(session.authContext),
    container.useCases.listAllLibraryItems.execute(session.authContext),
    container.useCases.listAllFileAssets.execute(session.authContext, { limit: 200 }),
    container.repositories.libraryCirculation.listCopiesByTenant(session.authContext.tenantId),
    container.repositories.libraryCirculation.listLoansByTenant(session.authContext.tenantId),
    container.repositories.libraryCirculation.listOccurrencesByTenant(session.authContext.tenantId),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.nome]));
  const fileTitleById = new Map(filesPage.items.map((f) => [f.id, f.titulo]));

  const now = Date.now();
  const overdueCount = loans.filter(
    (l) => ['retirado', 'atrasado'].includes(l.statusEmprestimo) && l.dueAt.getTime() < now,
  ).length;
  const awaitingPickupCount = loans.filter((l) => l.statusEmprestimo === 'aprovado').length;
  const pendingOccurrenceCount = occurrences.filter((o) =>
    ['relatado', 'em_analise'].includes(o.statusOcorrencia),
  ).length;

  const rows: CatalogRow[] = items.map((item) => {
    const itemCopies = copies.filter((c) => c.libraryItemId === item.id);
    const available = itemCopies.filter((c) => c.situacao === 'disponivel').length;
    return {
      id: item.id,
      titulo:
        item.titulo ||
        (item.fileId ? fileTitleById.get(item.fileId) : undefined) ||
        'Obra sem título',
      autor: item.autor ?? '',
      categoria: categoryNameById.get(item.categoriaId) ?? 'Sem categoria',
      formato: item.formato ?? 'digital',
      exemplaresLabel: `${available}/${itemCopies.length} disponíveis`,
      visualizacoes: item.contagemVisualizacoes,
      usoLabel: `${item.contagemDownloads} downloads · ${item.contagemEmprestimos ?? 0} empréstimos`,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Catálogo</h1>
          <p className="text-muted text-sm">Obras, exemplares e categorias do acervo.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button asChild className="col-span-2 w-full sm:w-auto">
            <Link href="/admin/acervo/biblioteca/novo">Adicionar obra</Link>
          </Button>
          <CreateLibraryCategoryDialog categories={categories} className="w-full sm:w-auto" />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Pendências da Biblioteca">
        <StatCard
          href="/admin/acervo/biblioteca/emprestimos"
          value={overdueCount}
          label="Empréstimos atrasados"
          tone={overdueCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          href="/admin/acervo/biblioteca/emprestimos"
          value={awaitingPickupCount}
          label="Aguardando retirada"
        />
        <StatCard
          href="/admin/acervo/biblioteca/baixas/ocorrencias"
          value={pendingOccurrenceCount}
          label="Ocorrências pendentes"
          tone={pendingOccurrenceCount > 0 ? 'warning' : 'default'}
        />
      </section>

      <LibraryCatalogBrowser rows={rows} />
    </div>
  );
}

function StatCard({
  href,
  value,
  label,
  tone = 'default',
}: {
  href: string;
  value: number;
  label: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <Link href={href} className="block">
      <Card className={tone === 'warning' && value > 0 ? 'border-amber-300' : undefined}>
        <CardContent className="p-4">
          <p
            className={`font-display text-3xl font-semibold ${tone === 'warning' && value > 0 ? 'text-amber-700' : ''}`}
          >
            {value}
          </p>
          <p className="text-muted text-sm">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
