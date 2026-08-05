import type { FileCategory } from '../entities/file-category.entity';

export interface IFileCategoryRepository {
  findById(id: string): Promise<FileCategory | null>;
  listByTenant(tenantId: string): Promise<FileCategory[]>;
  create(category: FileCategory): Promise<void>;
  update(category: FileCategory): Promise<void>;
}
