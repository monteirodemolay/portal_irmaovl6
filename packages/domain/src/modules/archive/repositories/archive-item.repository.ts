import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { ArchiveItem } from '../entities/archive-item.entity';

export interface IArchiveItemRepository {
  findById(id: string): Promise<ArchiveItem | null>;
  /** Todos os itens do tenant (não excluídos), paginados — uso administrativo. */
  findByTenant(tenantId: string, page: PageRequest): Promise<PageResult<ArchiveItem>>;
  /** Todos os itens vinculados a um Evento (não excluídos) — usado pelo Acervo do Evento. */
  findByEventId(eventId: string): Promise<ArchiveItem[]>;
  /**
   * Item de iniciação já existente pra este Irmão (marcador
   * `origemIniciacaoMemberId`), independente de estar excluído ou não —
   * usado como checagem de idempotência por `CreateInitiationArchiveItemUseCase`,
   * nunca deve deixar criar um segundo item de iniciação pro mesmo Irmão
   * mesmo que o primeiro tenha ido pra lixeira.
   */
  findByOrigemIniciacaoMemberId(tenantId: string, memberId: string): Promise<ArchiveItem | null>;
  /** Mesmo papel de `findByOrigemIniciacaoMemberId`, para o item de elevação (2º grau) — `CreateElevationArchiveItemUseCase`. */
  findByOrigemElevacaoMemberId(tenantId: string, memberId: string): Promise<ArchiveItem | null>;
  /** Mesmo papel de `findByOrigemIniciacaoMemberId`, para o item de exaltação (3º grau) — `CreateExaltationArchiveItemUseCase`. */
  findByOrigemExaltacaoMemberId(tenantId: string, memberId: string): Promise<ArchiveItem | null>;
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
  /** Total de itens do tenant (não excluídos) — Fase C, tile "Itens no Acervo VL6" do Painel administrativo. */
  countByTenant(tenantId: string): Promise<number>;
  /** Total de itens publicados do tenant (não excluídos) — Fase C, métricas. */
  countPublishedByTenant(tenantId: string): Promise<number>;
  create(item: ArchiveItem): Promise<void>;
  update(item: ArchiveItem): Promise<void>;
  /** Lixeira — soft delete (`deletedAt` preenchido), nunca exclusão física. */
  softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void>;
  /** Lixeira — restauração, limpa `deletedAt`. */
  restore(id: string, updatedBy: string): Promise<void>;
  /** Incremento atômico do contador de visualizações — Fase C, nunca via read-modify-write. */
  incrementViews(id: string): Promise<void>;
}
