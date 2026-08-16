import type { ArchiveExhibitionFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveExhibition, ExhibitionSection } from '../entities/archive-exhibition.entity';
import type { IArchiveExhibitionRepository } from '../repositories/archive-exhibition.repository';

export interface UpdateArchiveExhibitionDeps {
  archiveExhibitionRepository: IArchiveExhibitionRepository;
  clock: IClock;
}

export interface UpdateArchiveExhibitionInput extends ArchiveExhibitionFormValues {
  secoes: ExhibitionSection[];
}

export class UpdateArchiveExhibitionUseCase {
  constructor(private readonly deps: UpdateArchiveExhibitionDeps) {}

  async execute(
    ctx: AuthContext,
    exhibitionId: string,
    input: UpdateArchiveExhibitionInput,
  ): Promise<Result<ArchiveExhibition>> {
    requirePermission(ctx, 'archiveExhibition:update');

    const current = await this.deps.archiveExhibitionRepository.findById(exhibitionId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveExhibition', exhibitionId));
    }

    if (input.slug !== current.slug) {
      const existing = await this.deps.archiveExhibitionRepository.findBySlugAndTenant(
        ctx.tenantId,
        input.slug,
      );
      if (existing && existing.id !== exhibitionId) {
        return err(new ConflictError(`Já existe uma exposição com o slug "${input.slug}".`));
      }
    }

    const updated: ArchiveExhibition = {
      ...current,
      ...input,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.archiveExhibitionRepository.update(updated);

    return ok(updated);
  }
}
