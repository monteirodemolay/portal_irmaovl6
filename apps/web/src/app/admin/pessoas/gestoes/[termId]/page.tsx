import { notFound } from 'next/navigation';
import { BOARD_POSITION_KEYS, BOARD_POSITION_LABELS } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AssignPositionForm } from '@/modules/governance/components/assign-position-form';
import { CommitteeForm } from '@/modules/governance/components/committee-form';
import { EditCommitteeDialog } from '@/modules/governance/components/edit-committee-dialog';
import { createCommitteeAction } from '@/modules/governance/actions/governance-actions';

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

  const [assignments, membersPage, committees, allTerms] = await Promise.all([
    container.repositories.boardPositionAssignment.listByGestao(termId),
    container.useCases.searchMembers.execute(session.authContext, {}, { limit: 500 }),
    container.useCases.listCommitteesByGestao.execute(session.authContext, termId),
    container.repositories.boardTerm.listByTenant(session.authContext.tenantId),
  ]);
  const membersById = new Map(membersPage.items.map((m) => [m.id, m]));
  const createCommittee = createCommitteeAction.bind(null, termId);

  const previousTerm = allTerms
    .filter((t) => t.periodoInicio.getTime() < term.periodoInicio.getTime())
    .sort((a, b) => b.periodoInicio.getTime() - a.periodoInicio.getTime())[0];
  const previousAssignments = previousTerm
    ? await container.repositories.boardPositionAssignment.listByGestao(previousTerm.id)
    : [];
  const boardPositionKeySet = new Set<string>(BOARD_POSITION_KEYS);
  const extraCargos = [
    ...new Set(
      previousAssignments.map((a) => a.cargo).filter((cargo) => !boardPositionKeySet.has(cargo)),
    ),
  ];
  const currentExtraCargos = [
    ...new Set(assignments.map((a) => a.cargo).filter((cargo) => !boardPositionKeySet.has(cargo))),
  ];

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
          <AssignPositionForm
            gestaoId={termId}
            members={membersPage.items}
            extraCargos={extraCargos}
          />
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
          {currentExtraCargos.map((cargo) => {
            const seats = assignments.filter((a) => a.cargo === cargo);
            return (
              <Card key={cargo}>
                <CardContent className="flex flex-col gap-1 p-4">
                  <Badge variant="accent" className="w-fit">
                    {cargo}
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

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Comissões</h2>
        {committees.length === 0 ? (
          <p className="text-muted text-sm">Nenhuma comissão criada nesta gestão ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {committees.map((committee) => (
              <Card key={committee.id}>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-base">{committee.nome}</CardTitle>
                  <EditCommitteeDialog
                    committee={committee}
                    gestaoId={termId}
                    members={membersPage.items}
                  />
                </CardHeader>
                <CardContent className="text-muted flex flex-col gap-2 text-sm">
                  {committee.descricao && <p>{committee.descricao}</p>}
                  <p>{committee.membrosIds.length} membro(s)</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Nova Comissão</CardTitle>
          </CardHeader>
          <CardContent>
            <CommitteeForm action={createCommittee} members={membersPage.items} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
