import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { Member } from '../../membership/entities/member.entity';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { BoardTerm } from '../entities/board-term.entity';
import type { BoardPositionAssignment } from '../entities/board-position-assignment.entity';
import type { IBoardTermRepository } from '../repositories/board-term.repository';
import type { IBoardPositionAssignmentRepository } from '../repositories/board-position-assignment.repository';

export interface BoardSeat {
  assignment: BoardPositionAssignment;
  member: Member;
}

export interface ActiveBoard {
  term: BoardTerm;
  seats: BoardSeat[];
}

export interface GetActiveBoardDeps {
  boardTermRepository: IBoardTermRepository;
  assignmentRepository: IBoardPositionAssignmentRepository;
  memberRepository: IMemberRepository;
}

/** Diretoria da gestão vigente, com os dados do Irmão já resolvidos — usado em Área do Irmão e Site Público. */
export class GetActiveBoardUseCase {
  constructor(private readonly deps: GetActiveBoardDeps) {}

  async execute(ctx: AuthContext): Promise<ActiveBoard | null> {
    requirePermission(ctx, 'boardTerm:read');

    const term = await this.deps.boardTermRepository.findActive(ctx.tenantId);
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
