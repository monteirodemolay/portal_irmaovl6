import { BOARD_POSITION_LABELS } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { Card, CardContent, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';

export default async function MemberBoardPage() {
  const session = await requirePagePermission('boardTerm:read');

  const container = createServerContainer();
  const board = await container.useCases.getActiveBoard.execute(session.authContext);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Diretoria</h1>
      {!board ? (
        <EmptyState title="Nenhuma gestão vigente cadastrada" />
      ) : (
        <>
          <p className="text-muted">{board.term.nome}</p>
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
        </>
      )}
    </div>
  );
}
