import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IArtTemplateRepository } from '../repositories/art-template.repository';

export interface DeleteArtTemplateDeps {
  artTemplateRepository: IArtTemplateRepository;
  clock: IClock;
}

/**
 * Exclusão lógica (soft-delete) — `listAll`/`listActiveByType` já filtram
 * `deletedAt`, então o modelo some da biblioteca e não pode mais ser
 * escolhido pra novas publicações. Publicações já criadas a partir dele
 * buscam o modelo por `findById` direto (sem esse filtro), então continuam
 * editáveis/regeráveis normalmente — mesma garantia de não-quebra usada em
 * `soft-delete-file-asset.use-case.ts` e no Acervo VL6.
 */
export class DeleteArtTemplateUseCase {
  constructor(private readonly deps: DeleteArtTemplateDeps) {}

  async execute(ctx: AuthContext, templateId: string): Promise<Result<void>> {
    requirePermission(ctx, 'communication:manage');

    const template = await this.deps.artTemplateRepository.findById(templateId);
    if (!template || template.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArtTemplate', templateId));
    }

    const now = this.deps.clock.now();
    await this.deps.artTemplateRepository.update({
      ...template,
      deletedAt: now,
      status: 'archived',
      ativo: false,
      active: false,
      updatedAt: now,
      updatedBy: ctx.uid,
    });

    return ok(undefined);
  }
}
