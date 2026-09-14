import type { Honor } from '../entities/honor.entity';

export interface IHonorRepository {
  findById(id: string): Promise<Honor | null>;
  /** Honrarias de um Irmão cadastrado (não excluídas). */
  listByMemberId(tenantId: string, memberId: string): Promise<Honor[]>;
  /** Todas as honrarias do tenant (não excluídas) — base da Galeria de Honra VL6. */
  listByTenant(tenantId: string): Promise<Honor[]>;
  create(honor: Honor): Promise<void>;
  softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void>;
}
