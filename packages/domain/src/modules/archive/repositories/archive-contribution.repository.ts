import type { ArchiveContribution } from '../entities/archive-contribution.entity';

export interface IArchiveContributionRepository {
  findById(id: string): Promise<ArchiveContribution | null>;
  listByTenant(tenantId: string): Promise<ArchiveContribution[]>;
  listByMember(tenantId: string, memberId: string): Promise<ArchiveContribution[]>;
  /** Total com `moderacaoStatus === 'pendente'` — usado pelo Painel administrativo. */
  countPendingByTenant(tenantId: string): Promise<number>;
  create(contribution: ArchiveContribution): Promise<void>;
  update(contribution: ArchiveContribution): Promise<void>;
}
