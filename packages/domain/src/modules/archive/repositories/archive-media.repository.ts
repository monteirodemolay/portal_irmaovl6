import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { ArchiveMedia } from '../entities/archive-media.entity';

export interface IArchiveMediaRepository {
  findById(id: string): Promise<ArchiveMedia | null>;
  findByTenant(tenantId: string, page: PageRequest): Promise<PageResult<ArchiveMedia>>;
  /** Todas as mídias de um item (não excluídas), ordenadas por `order` — usado para renderizar o item e para `SetArchiveItemCoverUseCase`. */
  findByArchiveItemId(archiveItemId: string): Promise<ArchiveMedia[]>;
  create(archiveMedia: ArchiveMedia): Promise<void>;
  update(archiveMedia: ArchiveMedia): Promise<void>;
  softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void>;
  restore(id: string, updatedBy: string): Promise<void>;
}
