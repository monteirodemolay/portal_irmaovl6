import type { FileCategoryFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { FileCategory } from '../entities/file-category.entity';
import type { IFileCategoryRepository } from '../repositories/file-category.repository';

export interface CreateFileCategoryDeps {
  fileCategoryRepository: IFileCategoryRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export class CreateFileCategoryUseCase {
  constructor(private readonly deps: CreateFileCategoryDeps) {}

  async execute(ctx: AuthContext, input: FileCategoryFormValues): Promise<Result<FileCategory>> {
    requirePermission(ctx, 'file:manage');

    const now = this.deps.clock.now();
    const category: FileCategory = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.fileCategoryRepository.create(category);

    return ok(category);
  }
}
