import type { ArchiveExhibitionFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveExhibition } from '../entities/archive-exhibition.entity';
import type { IArchiveExhibitionRepository } from '../repositories/archive-exhibition.repository';

export interface CreateArchiveExhibitionDeps {
  archiveExhibitionRepository: IArchiveExhibitionRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export class CreateArchiveExhibitionUseCase {
  constructor(private readonly deps: CreateArchiveExhibitionDeps) {}

  async execute(
    ctx: AuthContext,
    input: ArchiveExhibitionFormValues,
  ): Promise<Result<ArchiveExhibition>> {
    requirePermission(ctx, 'archiveExhibition:create');

    const existing = await this.deps.archiveExhibitionRepository.findBySlugAndTenant(
      ctx.tenantId,
      input.slug,
    );
    if (existing) {
      return err(new ConflictError(`Já existe uma exposição com o slug "${input.slug}".`));
    }

    const now = this.deps.clock.now();
    const exhibition: ArchiveExhibition = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      secoes: [],
      publicado: false,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.archiveExhibitionRepository.create(exhibition);

    return ok(exhibition);
  }
}
