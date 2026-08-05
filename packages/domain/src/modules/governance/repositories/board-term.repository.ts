import type { BoardTerm } from '../entities/board-term.entity';

export interface IBoardTermRepository {
  findById(id: string): Promise<BoardTerm | null>;
  /** Gestão cujo período cobre a data informada (padrão: agora). */
  findActive(tenantId: string, at?: Date): Promise<BoardTerm | null>;
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
