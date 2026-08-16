import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveExhibition } from '../entities/archive-exhibition.entity';
import type { IArchiveExhibitionRepository } from '../repositories/archive-exhibition.repository';

export interface ListPublishedArchiveExhibitionsDeps {
  archiveExhibitionRepository: IArchiveExhibitionRepository;
}

/** Exposições publicadas — uso do Irmão em `/acervo/exposicoes`. */
export class ListPublishedArchiveExhibitionsUseCase {
  constructor(private readonly deps: ListPublishedArchiveExhibitionsDeps) {}

  async execute(ctx: AuthContext): Promise<ArchiveExhibition[]> {
    requirePermission(ctx, 'archiveExhibition:read');
    return this.deps.archiveExhibitionRepository.listPublishedByTenant(ctx.tenantId);
  }
}
