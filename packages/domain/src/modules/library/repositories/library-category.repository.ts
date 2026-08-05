import type { LibraryCategory } from '../entities/library-category.entity';

export interface ILibraryCategoryRepository {
  findById(id: string): Promise<LibraryCategory | null>;
  listByTenant(tenantId: string): Promise<LibraryCategory[]>;
  create(category: LibraryCategory): Promise<void>;
  update(category: LibraryCategory): Promise<void>;
}
