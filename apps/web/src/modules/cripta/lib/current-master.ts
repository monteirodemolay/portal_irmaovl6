import 'server-only';
import { createServerContainer } from '@vl6/infra';

/** Resolve the office each time. The incumbent may change between sealing and the next opening. */
export async function currentCriptaMaster(tenantId: string) {
  const container = createServerContainer();
  const term = await container.repositories.boardTerm.findActive(tenantId);
  if (!term) return null;
  const assignment = await container.repositories.boardPositionAssignment.findByGestaoAndCargo(term.id, 'veneravel_mestre');
  if (!assignment) return null;
  const member = await container.repositories.member.findById(assignment.memberId);
  if (!member || member.tenantId !== tenantId || member.situacao !== 'ativo' || !member.userId) return null;
  return { member, termId: term.id };
}
