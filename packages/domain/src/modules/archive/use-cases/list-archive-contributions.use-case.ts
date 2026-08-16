import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveContribution } from '../entities/archive-contribution.entity';
import type { IArchiveContributionRepository } from '../repositories/archive-contribution.repository';

export interface ListArchiveContributionsDeps {
  archiveContributionRepository: IArchiveContributionRepository;
}

/** Listagem administrativa — todas as contribuições do tenant, para moderação. */
export class ListArchiveContributionsUseCase {
  constructor(private readonly deps: ListArchiveContributionsDeps) {}

  async execute(ctx: AuthContext): Promise<ArchiveContribution[]> {
    requirePermission(ctx, 'archiveContribution:manage');
    return this.deps.archiveContributionRepository.listByTenant(ctx.tenantId);
  }
}
