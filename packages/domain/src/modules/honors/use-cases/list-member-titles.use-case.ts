import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { MemberTitle } from '../entities/member-title.entity';
import type { IMemberTitleRepository } from '../repositories/member-title.repository';

export interface ListMemberTitlesDeps {
  memberTitleRepository: IMemberTitleRepository;
}

/** Lista os títulos de um Irmão, mais recente primeiro — base da aba "Trajetória e Honrarias". */
export class ListMemberTitlesUseCase {
  constructor(private readonly deps: ListMemberTitlesDeps) {}

  async execute(ctx: AuthContext, memberId: string): Promise<MemberTitle[]> {
    requirePermission(ctx, 'honor:read');

    const titles = await this.deps.memberTitleRepository.listByMemberId(ctx.tenantId, memberId);
    return titles.sort((a, b) => {
      const aTime = a.dataConcessao?.getTime() ?? 0;
      const bTime = b.dataConcessao?.getTime() ?? 0;
      return bTime - aTime;
    });
  }
}
