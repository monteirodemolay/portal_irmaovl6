import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ConstellationView } from '../entities/constellation-view.entity';
import type { IConstellationViewRepository } from '../repositories/constellation-view.repository';

export interface ListMyConstellationViewsDeps {
  constellationViewRepository: IConstellationViewRepository;
}

/** "Meus quadros" — só os do próprio Irmão, mais novo primeiro. */
export class ListMyConstellationViewsUseCase {
  constructor(private readonly deps: ListMyConstellationViewsDeps) {}

  async execute(ctx: AuthContext): Promise<ConstellationView[]> {
    requirePermission(ctx, 'archiveRelation:read');

    const views = await this.deps.constellationViewRepository.listByOwner(ctx.tenantId, ctx.uid);
    return views
      .filter((view) => view.deletedAt === null)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}
