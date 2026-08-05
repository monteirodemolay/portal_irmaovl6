import type { BoardPositionKey } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { IBoardPositionAssignmentRepository } from '../../governance/repositories/board-position-assignment.repository';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository, MemberSearchFilters } from '../repositories/member.repository';

export type SearchMembersInput = Omit<MemberSearchFilters, 'tenantId'> & {
  /** Cargo atualmente ocupado na gestão vigente — cruza com `BoardPositionAssignment`. */
  cargo?: BoardPositionKey;
};

export interface SearchMembersDeps {
  memberRepository: IMemberRepository;
  boardTermRepository: IBoardTermRepository;
  boardPositionAssignmentRepository: IBoardPositionAssignmentRepository;
}

/**
 * Pesquisa de Irmãos por nome/grau/situação/cidade/CIM/cargo atual — requer
 * `member:read`. O filtro por `cargo` não é um campo direto do Member
 * (`cargoAtualId` guarda o id do `BoardPositionAssignment`, não a chave do
 * cargo) — por isso resolve primeiro os titulares do cargo na gestão
 * vigente e depois filtra o resultado da busca por esses ids.
 */
export class SearchMembersUseCase {
  constructor(private readonly deps: SearchMembersDeps) {}

  async execute(
    ctx: AuthContext,
    filters: SearchMembersInput,
    page: PageRequest,
  ): Promise<PageResult<Member>> {
    requirePermission(ctx, 'member:read');
    const { cargo, ...memberFilters } = filters;

    if (!cargo) {
      return this.deps.memberRepository.search({ ...memberFilters, tenantId: ctx.tenantId }, page);
    }

    const activeTerm = await this.deps.boardTermRepository.findActive(ctx.tenantId);
    if (!activeTerm) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const assignments = await this.deps.boardPositionAssignmentRepository.listByGestao(
      activeTerm.id,
    );
    const memberIds = new Set(
      assignments.filter((assignment) => assignment.cargo === cargo).map((a) => a.memberId),
    );
    if (memberIds.size === 0) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    const result = await this.deps.memberRepository.search(
      { ...memberFilters, tenantId: ctx.tenantId },
      { limit: 500 },
    );
    const filtered = result.items.filter((member) => memberIds.has(member.id));

    return { items: filtered.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
}
