import type { AuthContext } from '../../../shared/auth-context';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { ArchiveContribution } from '../entities/archive-contribution.entity';
import type { IArchiveContributionRepository } from '../repositories/archive-contribution.repository';

export interface ListMyArchiveContributionsDeps {
  archiveContributionRepository: IArchiveContributionRepository;
  memberRepository: IMemberRepository;
}

/** Ação pessoal — sem `requirePermission`, o critério é ser o autor do envio. */
export class ListMyArchiveContributionsUseCase {
  constructor(private readonly deps: ListMyArchiveContributionsDeps) {}

  async execute(ctx: AuthContext): Promise<ArchiveContribution[]> {
    const member = await this.deps.memberRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!member) return [];
    return this.deps.archiveContributionRepository.listByMember(ctx.tenantId, member.id);
  }
}
