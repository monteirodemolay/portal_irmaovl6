import type { ArchiveCatalogEntry } from '../entities/archive-catalog-entry.entity';

export interface IArchiveCatalogEntryRepository {
  findById(id: string): Promise<ArchiveCatalogEntry | null>;
  findByOrigemId(tenantId: string, origemId: string): Promise<ArchiveCatalogEntry | null>;
  listByTenant(tenantId: string): Promise<ArchiveCatalogEntry[]>;
  create(entry: ArchiveCatalogEntry): Promise<void>;
  update(entry: ArchiveCatalogEntry): Promise<void>;
}
