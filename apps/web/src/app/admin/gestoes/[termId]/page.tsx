import { notFound } from 'next/navigation';
import { BOARD_POSITION_KEYS, BOARD_POSITION_LABELS } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AssignPositionForm } from '@/modules/governance/components/assign-position-form';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export default async function BoardTermDetailPage({
  params,
}: {
  params: Promise<{ termId: string }>;
}) {
  const session = await requirePagePermission('boardTerm:read');
  const { termId } = await params;

  const container = createServerContainer();
  const term = await container.repositories.boardTerm.findById(termId);
  if (!term || term.tenantId !== session.authContext.tenantId) notFound();

  const [assignments, membersPage] = await Promise.all([
    container.repositories.boardPositionAssignment.listByGestao(termId),
    container.useCases.searchMembers.execute(session.authContext, {}, { limit: 500 }),
  ]);
  const membersById = new Map(membersPage.items.map((m) => [m.id, m]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">{term.nome}</h1>
        <p className="text-muted">
          {formatDate(term.periodoInicio)} — {formatDate(term.periodoFim)}
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Atribuir cargo</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignPositionForm gestaoId={termId} members={membersPage.items} />
        </CardContent>
      </Card>

      <div>
        <h2 className="font-display mb-3 text-lg font-semibold">Diretoria atual</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {BOARD_POSITION_KEYS.map((cargo) => {
            const seats = assignments.filter((a) => a.cargo === cargo);
            if (seats.length === 0) return null;
            return (
              <Card key={cargo}>
                <CardContent className="flex flex-col gap-1 p-4">
                  <Badge variant="accent" className="w-fit">
                    {BOARD_POSITION_LABELS[cargo]}
                  </Badge>
                  {seats.map((seat) => (
                    <p key={seat.id} className="text-sm font-medium">
                      {membersById.get(seat.memberId)?.nomeCompleto ?? '—'}
                    </p>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
