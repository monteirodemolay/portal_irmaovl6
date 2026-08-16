import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveRelation } from '../entities/archive-relation.entity';
import type { IArchiveRelationRepository } from '../repositories/archive-relation.repository';

export interface ListArchiveRelationsDeps {
  archiveRelationRepository: IArchiveRelationRepository;
}

/** Todas as relações do tenant — uso administrativo (`/admin/acervo/relacoes`). */
export class ListArchiveRelationsUseCase {
  constructor(private readonly deps: ListArchiveRelationsDeps) {}

  async execute(ctx: AuthContext): Promise<ArchiveRelation[]> {
    requirePermission(ctx, 'archiveRelation:read');
    return this.deps.archiveRelationRepository.listByTenant(ctx.tenantId);
  }
}
