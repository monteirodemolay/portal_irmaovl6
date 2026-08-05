import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { LibraryCategory } from '../entities/library-category.entity';
import type { ILibraryCategoryRepository } from '../repositories/library-category.repository';

export interface ListLibraryCategoriesDeps {
  libraryCategoryRepository: ILibraryCategoryRepository;
}

export class ListLibraryCategoriesUseCase {
  constructor(private readonly deps: ListLibraryCategoriesDeps) {}

  async execute(ctx: AuthContext): Promise<LibraryCategory[]> {
    requirePermission(ctx, 'libraryItem:read');
    return this.deps.libraryCategoryRepository.listByTenant(ctx.tenantId);
  }
}
