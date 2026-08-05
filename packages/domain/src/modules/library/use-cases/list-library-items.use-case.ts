import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { LibraryItem } from '../entities/library-item.entity';
import type { ILibraryItemRepository } from '../repositories/library-item.repository';

export interface ListLibraryItemsDeps {
  libraryItemRepository: ILibraryItemRepository;
}

export class ListLibraryItemsByCategoryUseCase {
  constructor(private readonly deps: ListLibraryItemsDeps) {}

  async execute(ctx: AuthContext, categoriaId: string): Promise<LibraryItem[]> {
    requirePermission(ctx, 'libraryItem:read');
    return this.deps.libraryItemRepository.listByCategory(ctx.tenantId, categoriaId);
  }
}

/** Listagem administrativa (todas as categorias) — requer `libraryItem:read`. */
export class ListAllLibraryItemsUseCase {
  constructor(private readonly deps: ListLibraryItemsDeps) {}

  async execute(ctx: AuthContext): Promise<LibraryItem[]> {
    requirePermission(ctx, 'libraryItem:read');
    return this.deps.libraryItemRepository.listByTenant(ctx.tenantId);
  }
}
