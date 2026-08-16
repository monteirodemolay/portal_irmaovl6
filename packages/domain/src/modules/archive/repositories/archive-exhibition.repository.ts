import type { ArchiveExhibition } from '../entities/archive-exhibition.entity';

export interface IArchiveExhibitionRepository {
  findById(id: string): Promise<ArchiveExhibition | null>;
  findBySlugAndTenant(tenantId: string, slug: string): Promise<ArchiveExhibition | null>;
  listByTenant(tenantId: string): Promise<ArchiveExhibition[]>;
  listPublishedByTenant(tenantId: string): Promise<ArchiveExhibition[]>;
  create(exhibition: ArchiveExhibition): Promise<void>;
  update(exhibition: ArchiveExhibition): Promise<void>;
}
