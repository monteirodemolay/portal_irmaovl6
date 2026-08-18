import type { PersonalTask } from '../entities/personal-task.entity';

export interface IPersonalTaskRepository {
  findById(id: string): Promise<PersonalTask | null>;
  /** Só filtros de igualdade (tenantId/userId/deletedAt) — sem `orderBy`, não exige índice composto novo. */
  listByUser(tenantId: string, userId: string): Promise<PersonalTask[]>;
  create(task: PersonalTask): Promise<void>;
  /** Também usado para soft delete (`deletedAt`/`status`/`ativo`) — segue o contrato padrão de `BaseEntity`. */
  update(task: PersonalTask): Promise<void>;
}
