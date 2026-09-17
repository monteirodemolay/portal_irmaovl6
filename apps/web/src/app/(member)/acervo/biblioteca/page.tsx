import Link from 'next/link';
import type { LibraryItem } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { Badge, BookOpen, Button, Card, CardContent, EmptyState, Star } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { AddToLibraryCartButton } from '@/modules/library/components/library-cart';

const FORMAT_LABEL = {
  digital: 'Digital',
  fisico: 'Físico',
  fisico_digital: 'Físico + digital',
} as const;

export default async function LibraryCatalogPage() {
  const session = await requirePagePermission('libraryItem:read');
  const container = createServerContainer();
  const [items, categories, copies] = await Promise.all([
    container.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    container.useCases.listLibraryCategories.execute(session.authContext),
    container.repositories.libraryCirculation.listCopiesByTenant(session.authContext.tenantId),
  ]);
  const categoryById = new Map(categories.map((category) => [category.id, category.nome]));
  const availableByItem = new Map<string, number>();
  for (const copy of copies) {
    if (copy.situacao === 'disponivel') {
      availableByItem.set(copy.libraryItemId, (availableByItem.get(copy.libraryItemId) ?? 0) + 1);
    }
  }
  const topDownloads = [...items]
    .filter((item) => item.fileId)
    .sort((a, b) => b.contagemDownloads - a.contagemDownloads)
    .slice(0, 5);
  const topLoans = [...items]
    .filter((item) => item.formato !== 'digital')
    .sort((a, b) => (b.contagemEmprestimos ?? 0) - (a.contagemEmprestimos ?? 0))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-7">
      <AcervoPageHeader
        title="Biblioteca"
        description="Consulte o acervo, leia publicações digitais e solicite obras físicas para retirada em uma sessão da Loja."
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/acervo/biblioteca/carrinho">Carrinho de empréstimos</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/acervo/biblioteca/emprestimos">Meus empréstimos</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title="Nenhuma obra catalogada ainda"
          description="As obras cadastradas pelo Irmão Bibliotecário aparecerão aqui."
        />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <Ranking title="Top 5 — mais baixados" items={topDownloads} value="downloads" />
            <Ranking title="Top 5 — mais retirados" items={topLoans} value="loans" />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const physical = item.formato !== 'digital';
              const available = availableByItem.get(item.id) ?? 0;
              const average = item.quantidadeAvaliacoes
                ? (item.somaAvaliacoes ?? 0) / item.quantidadeAvaliacoes
                : null;
              return (
                <Card key={item.id} className="overflow-hidden">
                  {item.capaUrl ? (
                    <img
                      src={item.capaUrl}
                      alt={`Capa de ${item.titulo ?? 'obra'}`}
                      className="bg-surface h-52 w-full object-contain"
                    />
                  ) : (
                    <div className="bg-surface text-muted flex h-52 items-center justify-center">
                      <BookOpen size={48} />
                    </div>
                  )}
                  <CardContent className="grid gap-3 p-5">
                    <div className="flex flex-wrap gap-2">
                      <Badge>{FORMAT_LABEL[item.formato ?? 'digital']}</Badge>
                      <Badge variant={physical && available === 0 ? 'warning' : 'success'}>
                        {physical
                          ? available > 0
                            ? `${available} disponível(is)`
                            : 'Indisponível'
                          : 'Acesso digital'}
                      </Badge>
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold">
                        {item.titulo ?? 'Publicação'}
                      </h2>
                      <p className="text-muted text-sm">
                        {item.autor ?? 'Autoria não informada'} ·{' '}
                        {categoryById.get(item.categoriaId) ?? 'Acervo'}
                      </p>
                    </div>
                    {average !== null && (
                      <p className="flex items-center gap-1 text-sm">
                        <Star size={15} /> {average.toFixed(1)} ({item.quantidadeAvaliacoes})
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm">
                        <Link href={`/acervo/biblioteca/${item.id}`}>Ver obra</Link>
                      </Button>
                      {physical && available > 0 && (
                        <AddToLibraryCartButton itemId={item.id} title={item.titulo ?? 'obra'} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

function Ranking({
  title,
  items,
  value,
}: {
  title: string;
  items: LibraryItem[];
  value: 'downloads' | 'loans';
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="font-display mb-3 text-lg font-semibold">{title}</h2>
        {items.length === 0 ? (
          <p className="text-muted text-sm">Ainda sem movimentação.</p>
        ) : (
          <ol className="grid gap-2">
            {items.map((item, index) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <Link
                  className="font-medium hover:underline"
                  href={`/acervo/biblioteca/${item.id}`}
                >
                  {index + 1}. {item.titulo ?? 'Publicação'}
                </Link>
                <span className="text-muted">
                  {value === 'downloads' ? item.contagemDownloads : (item.contagemEmprestimos ?? 0)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
