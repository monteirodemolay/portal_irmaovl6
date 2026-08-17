import type { PersonalEvent } from '../entities/personal-event.entity';

export interface IPersonalEventRepository {
  findById(id: string): Promise<PersonalEvent | null>;
  listByUserInRange(
    tenantId: string,
    userId: string,
    from: Date,
    to: Date,
  ): Promise<PersonalEvent[]>;
  create(event: PersonalEvent): Promise<void>;
  /** Também usado para soft delete (`deletedAt`/`status`/`ativo`) — segue o contrato padrão de `BaseEntity`. */
  update(event: PersonalEvent): Promise<void>;
}
