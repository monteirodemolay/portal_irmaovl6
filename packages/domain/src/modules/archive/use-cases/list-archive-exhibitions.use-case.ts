import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveExhibition } from '../entities/archive-exhibition.entity';
import type { IArchiveExhibitionRepository } from '../repositories/archive-exhibition.repository';

export interface ListArchiveExhibitionsDeps {
  archiveExhibitionRepository: IArchiveExhibitionRepository;
}

/** Todas as exposições do tenant, publicadas ou não — uso administrativo. */
export class ListArchiveExhibitionsUseCase {
  constructor(private readonly deps: ListArchiveExhibitionsDeps) {}

  async execute(ctx: AuthContext): Promise<ArchiveExhibition[]> {
    requirePermission(ctx, 'archiveExhibition:read');
    return this.deps.archiveExhibitionRepository.listByTenant(ctx.tenantId);
  }
}
