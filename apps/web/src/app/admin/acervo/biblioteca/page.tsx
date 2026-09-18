import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { LibraryItem } from '@vl6/domain';
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  EmptyState,
  type DataTableColumn,
} from '@vl6/ui';
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
    {
      key: 'acoes',
      header: 'Ações',
      cell: (item) => (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/acervo/biblioteca/${item.id}/editar`}>Editar</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/acervo/biblioteca/${item.id}/historico`}>Histórico</Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Biblioteca</h1>
          <p className="text-muted text-sm">
            Catálogo, circulação, localização e histórico das obras.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap xl:max-w-4xl xl:justify-end">
          <Button asChild className="col-span-2 w-full sm:w-auto">
            <Link href="/admin/acervo/biblioteca/novo">Adicionar obra</Link>
          </Button>
          <CreateLibraryCategoryDialog categories={categories} className="w-full sm:w-auto" />
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/acervo/biblioteca/estantes">Estantes</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/acervo/biblioteca/etiquetas">Etiquetas QR</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/acervo/biblioteca/emprestimo-presencial">Empréstimo presencial</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
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
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/acervo/biblioteca/baixas">Baixas</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/acervo/biblioteca/downloads">Downloads</Link>
          </Button>
        </div>
      </header>

      {items.length > 0 && (
        <section className="grid gap-3 md:hidden" aria-label="Obras da Biblioteca">
          {items.map((item) => {
            const itemCopies = copies.filter((copy) => copy.libraryItemId === item.id);
            const available = itemCopies.filter((copy) => copy.situacao === 'disponivel').length;
            return (
              <Card key={item.id}>
                <CardContent className="grid gap-3 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="break-words font-semibold">
                        {item.titulo ??
                          (item.fileId ? fileTitleById.get(item.fileId) : null) ??
                          'Obra sem título'}
                      </h2>
                      <p className="text-muted text-sm">
                        {categoryNameById.get(item.categoriaId) ?? 'Sem categoria'}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {item.formato ?? 'digital'}
                    </Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted text-xs">Exemplares</dt>
                      <dd className="font-medium">
                        {available}/{itemCopies.length} disponíveis
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted text-xs">Uso</dt>
                      <dd className="font-medium">
                        {item.contagemDownloads} downloads
                        <br />
                        {item.contagemEmprestimos ?? 0} empréstimos
                      </dd>
                    </div>
                  </dl>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link href={`/admin/acervo/biblioteca/${item.id}/editar`}>Editar obra</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link href={`/admin/acervo/biblioteca/${item.id}/historico`}>Histórico</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      <div className={items.length > 0 ? 'hidden md:block' : undefined}>
        <DataTable
          columns={columns}
          rows={items}
          getRowId={(item) => item.id}
          emptyState={
            <EmptyState
              title="Nenhum item na Biblioteca"
              description="Cadastre a primeira obra física ou digital para iniciar o catálogo."
              action={
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link href="/admin/acervo/biblioteca/novo">Adicionar obra</Link>
                </Button>
              }
            />
          }
        />
      </div>
    </div>
  );
}
