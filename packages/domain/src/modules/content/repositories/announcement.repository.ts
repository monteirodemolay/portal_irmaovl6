import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { Announcement } from '../entities/announcement.entity';

export interface IAnnouncementRepository {
  findById(id: string): Promise<Announcement | null>;
  listActive(tenantId: string, at?: Date): Promise<Announcement[]>;
  listHighlighted(tenantId: string): Promise<Announcement[]>;
  listAll(tenantId: string): Promise<Announcement[]>;
  /** Aba principal do admin — exclui excluídos e vencidos (ver `listConcluded`). */
  listAllActive(tenantId: string, at?: Date): Promise<Announcement[]>;
  /** Aba "Concluídos" do admin — vencidos OU excluídos, mais novo primeiro. */
  listConcluded(tenantId: string, page: PageRequest, at?: Date): Promise<PageResult<Announcement>>;
  /** Total de avisos publicados (independente de expiração) — usado pelo Painel administrativo. */
  countPublishedByTenant(tenantId: string): Promise<number>;
  create(announcement: Announcement): Promise<void>;
  update(announcement: Announcement): Promise<void>;
  /** Exclusão física — nunca chamado sem o item já ter passado por soft delete. */
  hardDelete(id: string): Promise<void>;
}
