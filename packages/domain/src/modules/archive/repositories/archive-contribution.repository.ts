import type { ArchiveContribution } from '../entities/archive-contribution.entity';

export interface IArchiveContributionRepository {
  findById(id: string): Promise<ArchiveContribution | null>;
  listByTenant(tenantId: string): Promise<ArchiveContribution[]>;
  listByMember(tenantId: string, memberId: string): Promise<ArchiveContribution[]>;
  create(contribution: ArchiveContribution): Promise<void>;
  update(contribution: ArchiveContribution): Promise<void>;
}
