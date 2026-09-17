import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { LibraryItem } from '@vl6/domain';
import { Badge, Button, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { CreateLibraryCategoryDialog } from '@/modules/library/components/create-library-category-dialog';

export default async function LibraryPage() {
  const session = await requirePagePermission('libraryItem:read');

  const container = createServerContainer();
  const [categories, items, filesPage, copies, loans] = await Promise.all([
    container.useCases.listLibraryCategories.execute(session.authContext),
    container.useCases.listAllLibraryItems.execute(session.authContext),
    container.useCases.listAllFileAssets.execute(session.authContext, { limit: 200 }),
    container.repositories.libraryCirculation.listCopiesByTenant(session.authContext.tenantId),
    container.repositories.libraryCirculation.listLoansByTenant(session.authContext.tenantId),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.nome]));
  const fileTitleById = new Map(filesPage.items.map((f) => [f.id, f.titulo]));

  const columns: DataTableColumn<LibraryItem>[] = [
    {
      key: 'arquivo',
      header: 'Arquivo',
      cell: (item) => (
        <span className="font-medium">
          {item.titulo ?? (item.fileId ? fileTitleById.get(item.fileId) : null) ?? '—'}
        </span>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoria',
      cell: (item) => categoryNameById.get(item.categoriaId) ?? '—',
    },
    {
      key: 'formato',
      header: 'Formato',
      cell: (item) => <Badge variant="outline">{item.formato ?? 'digital'}</Badge>,
    },
    {
      key: 'exemplares',
      header: 'Exemplares',
      cell: (item) => {
        const all = copies.filter((c) => c.libraryItemId === item.id);
        return `${all.filter((c) => c.situacao === 'disponivel').length}/${all.length} disponíveis`;
      },
    },
    { key: 'visualizacoes', header: 'Visualizações', cell: (item) => item.contagemVisualizacoes },
    {
      key: 'downloads',
      header: 'Uso',
      cell: (item) =>
        `${item.contagemDownloads} downloads · ${item.contagemEmprestimos ?? 0} empréstimos`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Biblioteca</h1>
        <div className="flex gap-2">
          <CreateLibraryCategoryDialog categories={categories} />
          <Button asChild variant="outline">
            <Link href="/admin/acervo/biblioteca/estantes">Estantes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/acervo/biblioteca/etiquetas">Etiquetas QR</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/acervo/biblioteca/emprestimos">
              Empréstimos (
              {
                loans.filter((l) =>
                  ['solicitado', 'aprovado', 'retirado', 'atrasado'].includes(l.statusEmprestimo),
                ).length
              }
              )
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/acervo/biblioteca/baixas">Baixas</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/acervo/biblioteca/downloads">Downloads</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/acervo/biblioteca/novo">Adicionar à Biblioteca</Link>
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={items}
        getRowId={(item) => item.id}
        emptyState={
          <EmptyState
            title="Nenhum item na Biblioteca"
            description="Cadastre um Arquivo primeiro e depois cadastre-o aqui para curadoria."
            action={
              <Button asChild size="sm">
                <Link href="/admin/acervo/biblioteca/novo">Adicionar à Biblioteca</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
