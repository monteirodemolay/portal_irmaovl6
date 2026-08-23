import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { ArchiveItem } from '../entities/archive-item.entity';

export interface IArchiveItemRepository {
  findById(id: string): Promise<ArchiveItem | null>;
  /** Todos os itens do tenant (não excluídos), paginados — uso administrativo. */
  findByTenant(tenantId: string, page: PageRequest): Promise<PageResult<ArchiveItem>>;
  /** Todos os itens vinculados a um Evento (não excluídos) — usado pelo Acervo do Evento. */
  findByEventId(eventId: string): Promise<ArchiveItem[]>;
  /** Lixeira administrativa (Fase 3) — itens do tenant com `deletedAt` preenchido. */
  findDeletedByTenant(tenantId: string, page: PageRequest): Promise<PageResult<ArchiveItem>>;
  /**
   * Itens agendados (`publicarEm` preenchido e já vencido) e ainda não
   * publicados — Fase B "Publicação avançada"
   * (`PublishScheduledArchiveItemsUseCase`). Só retorna itens em
   * `pronto_para_publicar` (nunca `rascunho`, mesmo com `publicarEm`
   * vencido — o checklist de pendências continua a mesma barreira).
   */
  findScheduledForPublication(tenantId: string, now: Date): Promise<ArchiveItem[]>;
  create(item: ArchiveItem): Promise<void>;
  update(item: ArchiveItem): Promise<void>;
  /** Lixeira — soft delete (`deletedAt` preenchido), nunca exclusão física. */
  softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void>;
  /** Lixeira — restauração, limpa `deletedAt`. */
  restore(id: string, updatedBy: string): Promise<void>;
}
