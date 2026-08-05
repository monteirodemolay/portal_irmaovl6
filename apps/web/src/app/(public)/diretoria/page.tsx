import { notFound } from 'next/navigation';
import { BOARD_POSITION_LABELS } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { Card, CardContent, EmptyState } from '@vl6/ui';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

export default async function PublicBoardPage() {
  const current = await getCurrentTenant();
  if (!current) notFound();

  const container = createServerContainer();
  const board = await container.useCases.getPublicBoard.execute(current.tenant.id);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-display text-3xl font-semibold">Diretoria</h1>
        <p className="text-muted">{current.tenant.nome}</p>
      </div>
      {!board ? (
        <EmptyState title="Nenhuma gestão vigente cadastrada" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {board.seats.map((seat) => (
            <Card key={seat.assignment.id}>
              <CardContent className="p-4">
                <p className="text-muted font-mono text-xs uppercase">
                  {BOARD_POSITION_LABELS[seat.assignment.cargo]}
                </p>
                <p className="font-medium">{seat.member.nomeCompleto}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
