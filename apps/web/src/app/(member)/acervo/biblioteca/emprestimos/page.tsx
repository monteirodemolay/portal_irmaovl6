import Link from 'next/link';
import type { LibraryItem, LibraryLoan } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { Badge, Button, Card, CardContent, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { OccurrenceReportForm } from '@/modules/library/components/library-engagement-forms';
import { groupLibraryLoansByPackage } from '@/modules/library/lib/group-library-loans';

const STATUS_LABEL = {
  solicitado: 'Aguardando aprovação',
  aprovado: 'Aprovado para retirada',
  retirado: 'Em poder do Irmão',
  atrasado: 'Devolução atrasada',
  devolvido: 'Devolvido',
  recusado: 'Não autorizado',
  cancelado: 'Cancelado',
} as const;

export default async function MyLibraryLoansPage() {
  const session = await requirePagePermission('libraryItem:read');
  const container = createServerContainer();
  const [loans, items] = await Promise.all([
    container.repositories.libraryCirculation.listLoansByUser(
      session.authContext.tenantId,
      session.authContext.uid,
    ),
    container.repositories.libraryItem.listByTenant(session.authContext.tenantId),
  ]);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const packages = groupLibraryLoansByPackage(loans);
  const active = packages.filter((group) => group.active);
  const archived = packages.filter((group) => !group.active);

  return (
    <div className="grid gap-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-accent text-sm font-semibold uppercase tracking-widest">
            Minha biblioteca
          </p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Meus empréstimos</h1>
          <p className="text-muted">Acompanhe cada pacote, a retirada, o prazo e a devolução.</p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/acervo/biblioteca">Catálogo</Link>
        </Button>
      </header>

      {packages.length === 0 ? (
        <EmptyState
          title="Nenhum empréstimo registrado"
          description="As solicitações feitas no catálogo aparecerão aqui."
        />
      ) : (
        <>
          <PackageSection
            title="Pacotes ativos e emprestados"
            packages={active}
            itemById={itemById}
          />
          <PackageSection
            title="Pacotes passados — arquivados"
            packages={archived}
            itemById={itemById}
          />
        </>
      )}
    </div>
  );
}

function PackageSection({
  title,
  packages,
  itemById,
}: {
  title: string;
  packages: ReturnType<typeof groupLibraryLoansByPackage<LibraryLoan>>;
  itemById: Map<string, LibraryItem>;
}) {
  return (
    <section className="grid gap-3">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {packages.length === 0 ? (
        <p className="text-muted rounded-xl border p-5 text-sm">Nenhum pacote nesta área.</p>
      ) : (
        packages.map((group) => (
          <Card key={group.id}>
            <CardContent className="grid gap-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">Pacote #{group.id.slice(-8).toUpperCase()}</p>
                  <p className="text-muted text-xs">
                    Solicitado em {group.createdAt.toLocaleDateString('pt-BR')} ·{' '}
                    {group.loans.length} obra(s)
                  </p>
                </div>
                <Badge variant={group.active ? 'warning' : 'outline'}>
                  {group.active ? 'Ativo' : 'Arquivado'}
                </Badge>
              </div>
              <div className="grid gap-3">
                {group.loans.map((loan) => {
                  const item = itemById.get(loan.libraryItemId);
                  return (
                    <article key={loan.id} className="grid gap-2 rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            className="break-words font-medium hover:underline"
                            href={`/acervo/biblioteca/${loan.libraryItemId}`}
                          >
                            {item?.titulo ?? 'Obra do acervo'}
                          </Link>
                          <p className="text-muted text-xs">
                            Retirada sugerida: {loan.requestedPickupAt.toLocaleDateString('pt-BR')}{' '}
                            · devolução: {loan.dueAt.toLocaleDateString('pt-BR')}
                          </p>
                          {loan.librarianNotes && (
                            <p className="text-muted mt-1 text-xs">
                              Bibliotecário: {loan.librarianNotes}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={loan.statusEmprestimo === 'atrasado' ? 'destructive' : 'outline'}
                        >
                          {STATUS_LABEL[loan.statusEmprestimo]}
                        </Badge>
                      </div>
                      {['retirado', 'atrasado'].includes(loan.statusEmprestimo) && (
                        <OccurrenceReportForm loanId={loan.id} />
                      )}
                    </article>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </section>
  );
}
