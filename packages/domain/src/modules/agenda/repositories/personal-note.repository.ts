import type { PersonalNote } from '../entities/personal-note.entity';

export interface IPersonalNoteRepository {
  findById(id: string): Promise<PersonalNote | null>;
  /** Só filtros de igualdade — sem `orderBy`, não exige índice composto novo. */
  listByUser(tenantId: string, userId: string): Promise<PersonalNote[]>;
  findByEvent(
    tenantId: string,
    userId: string,
    eventoOrigem: string,
    eventoId: string,
  ): Promise<PersonalNote | null>;
  create(note: PersonalNote): Promise<void>;
  /** Também usado para soft delete (`deletedAt`/`status`/`ativo`) — segue o contrato padrão de `BaseEntity`. */
  update(note: PersonalNote): Promise<void>;
}
