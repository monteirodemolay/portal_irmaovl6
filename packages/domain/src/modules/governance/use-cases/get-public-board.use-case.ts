import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IBoardTermRepository } from '../repositories/board-term.repository';
import type { IBoardPositionAssignmentRepository } from '../repositories/board-position-assignment.repository';
import type { BoardSeat, ActiveBoard } from './get-active-board.use-case';

export interface GetPublicBoardDeps {
  boardTermRepository: IBoardTermRepository;
  assignmentRepository: IBoardPositionAssignmentRepository;
  memberRepository: IMemberRepository;
}

/**
 * Variante pública (sem `AuthContext`) de `GetActiveBoardUseCase` — a
 * Diretoria é conteúdo institucional público (ver site público em
 * docs/architecture/01-visao-geral.md), diferente das operações
 * administrativas sobre `boardTerm`, essas sim gated por RBAC.
 */
export class GetPublicBoardUseCase {
  constructor(private readonly deps: GetPublicBoardDeps) {}

  async execute(tenantId: string): Promise<ActiveBoard | null> {
    const term = await this.deps.boardTermRepository.findActive(tenantId);
    if (!term) return null;

    const assignments = await this.deps.assignmentRepository.listByGestao(term.id);
    const members = await Promise.all(
      assignments.map((assignment) => this.deps.memberRepository.findById(assignment.memberId)),
    );

    const seats: BoardSeat[] = assignments
      .map((assignment, index) => {
        const member = members[index];
        return member ? { assignment, member } : null;
      })
      .filter((seat): seat is BoardSeat => seat !== null)
      .sort((a, b) => a.assignment.ordem - b.assignment.ordem);

    return { term, seats };
  }
}
