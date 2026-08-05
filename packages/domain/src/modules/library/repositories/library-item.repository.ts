import type { LibraryItem } from '../entities/library-item.entity';

export interface ILibraryItemRepository {
  findById(id: string): Promise<LibraryItem | null>;
  listByCategory(tenantId: string, categoriaId: string): Promise<LibraryItem[]>;
  listByTenant(tenantId: string): Promise<LibraryItem[]>;
  create(item: LibraryItem): Promise<void>;
  update(item: LibraryItem): Promise<void>;
  incrementDownloads(id: string): Promise<void>;
  incrementViews(id: string): Promise<void>;
}
