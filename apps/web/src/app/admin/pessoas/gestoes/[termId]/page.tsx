import { notFound } from 'next/navigation';
import {
  BOARD_POSITION_KEYS,
  getBoardPositionHierarchyRank,
  getBoardPositionOrdinalLabel,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { Card, CardContent, CardHeader, CardTitle } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AssignPositionForm } from '@/modules/governance/components/assign-position-form';
import { BoardPositionSeatCard } from '@/modules/governance/components/board-position-seat-card';
import { CommitteeForm } from '@/modules/governance/components/committee-form';
import { EditBoardTermDialog } from '@/modules/governance/components/edit-board-term-dialog';
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
  // Posição do titular dentro do próprio cargo (1-based) — mesma lógica de
  // `/acervo/gestoes/[gestaoId]/page.tsx`, dá "1º Diácono"/"2º Diácono" sem
  // depender de o Administrador ter digitado a ordem certa no cadastro.
  const posicaoNoCargo = new Map<string, number>();
  const counters: Record<string, number> = {};
  for (const seat of [...assignments].sort((a, b) => a.ordem - b.ordem)) {
    counters[seat.cargo] = (counters[seat.cargo] ?? 0) + 1;
    posicaoNoCargo.set(seat.id, counters[seat.cargo]!);
  }
  const seatsOrdenados = [...assignments].sort((a, b) => {
    const rankDiff =
      getBoardPositionHierarchyRank(a.cargo) - getBoardPositionHierarchyRank(b.cargo);
    return rankDiff !== 0 ? rankDiff : a.ordem - b.ordem;
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">{term.nome}</h1>
          <p className="text-muted">
            {formatDate(term.periodoInicio)} — {formatDate(term.periodoFim)}
          </p>
        </div>
        <EditBoardTermDialog term={term} />
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
        {seatsOrdenados.length === 0 ? (
          <p className="text-muted text-sm">Nenhum cargo atribuído nesta gestão ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {seatsOrdenados.map((seat) => (
              <BoardPositionSeatCard
                key={seat.id}
                gestaoId={termId}
                assignmentId={seat.id}
                cargo={seat.cargo}
                label={getBoardPositionOrdinalLabel(seat.cargo, posicaoNoCargo.get(seat.id) ?? 0)}
                nomeAtual={membersById.get(seat.memberId)?.nomeCompleto ?? '—'}
                ordem={seat.ordem}
                members={membersPage.items}
              />
            ))}
          </div>
        )}
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
