import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { FileCategory } from '../entities/file-category.entity';
import type { IFileCategoryRepository } from '../repositories/file-category.repository';

export interface ListFileCategoriesDeps {
  fileCategoryRepository: IFileCategoryRepository;
}

export class ListFileCategoriesUseCase {
  constructor(private readonly deps: ListFileCategoriesDeps) {}

  async execute(ctx: AuthContext): Promise<FileCategory[]> {
    requirePermission(ctx, 'file:read');
    return this.deps.fileCategoryRepository.listByTenant(ctx.tenantId);
  }
}
