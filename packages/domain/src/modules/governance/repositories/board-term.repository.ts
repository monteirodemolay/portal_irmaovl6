import type { BoardTerm } from '../entities/board-term.entity';

export interface IBoardTermRepository {
  findById(id: string): Promise<BoardTerm | null>;
  /** Gestão cujo período cobre a data informada (padrão: agora). */
  findActive(tenantId: string, at?: Date): Promise<BoardTerm | null>;
  /**
   * Gestão cujo intervalo `[periodoInicio, periodoFim]` contém a data
   * informada — Fase 1 da Fundação do Acervo VL6 (docs/architecture/
   * 11-acervo-vl6.md §11.5), usada para identificar automaticamente a
   * Gestão de um Evento/`ArchiveItem` a partir de uma data arbitrária
   * (não necessariamente "agora", diferente de `findActive`).
   */
  findByDate(tenantId: string, date: Date): Promise<BoardTerm | null>;
  listByTenant(tenantId: string): Promise<BoardTerm[]>;
  /** Usado para impedir períodos sobrepostos (docs/architecture/06 §6.2). */
  overlaps(
    tenantId: string,
    periodoInicio: Date,
    periodoFim: Date,
    excludeId?: string,
  ): Promise<boolean>;
  create(term: BoardTerm): Promise<void>;
  update(term: BoardTerm): Promise<void>;
}
