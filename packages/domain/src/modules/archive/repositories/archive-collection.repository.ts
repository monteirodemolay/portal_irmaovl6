import type { ArchiveCollection } from '../entities/archive-collection.entity';

export interface IArchiveCollectionRepository {
  findById(id: string): Promise<ArchiveCollection | null>;
  findBySlugAndTenant(tenantId: string, slug: string): Promise<ArchiveCollection | null>;
  /** Todas as coleções do tenant (não excluídas) — uso administrativo. */
  listByTenant(tenantId: string): Promise<ArchiveCollection[]>;
  /** Só coleções publicadas — uso do Irmão em `/acervo/colecoes` e `/acervo/descobrir`. */
  listPublishedByTenant(tenantId: string): Promise<ArchiveCollection[]>;
  create(collection: ArchiveCollection): Promise<void>;
  update(collection: ArchiveCollection): Promise<void>;
}
