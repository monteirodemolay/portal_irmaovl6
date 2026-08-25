import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArtTemplate } from '../entities/art-template.entity';
import type { IArtTemplateRepository } from '../repositories/art-template.repository';

export class ListArtTemplatesUseCase {
  constructor(private readonly deps: { artTemplateRepository: IArtTemplateRepository }) {}

  async execute(ctx: AuthContext): Promise<ArtTemplate[]> {
    requirePermission(ctx, 'communication:manage');
    return this.deps.artTemplateRepository.listAll(ctx.tenantId);
  }
}
