import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository, MemberSearchFilters } from '../repositories/member.repository';

export interface SearchMembersDeps {
  memberRepository: IMemberRepository;
}

export type SearchMembersInput = Omit<MemberSearchFilters, 'tenantId'>;

/** Pesquisa de Irmãos por nome/grau/situação/cidade/CIM — requer `member:read`. */
export class SearchMembersUseCase {
  constructor(private readonly deps: SearchMembersDeps) {}

  async execute(
    ctx: AuthContext,
    filters: SearchMembersInput,
    page: PageRequest,
  ): Promise<PageResult<Member>> {
    requirePermission(ctx, 'member:read');
    return this.deps.memberRepository.search({ ...filters, tenantId: ctx.tenantId }, page);
  }
}
