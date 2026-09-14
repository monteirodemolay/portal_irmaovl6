import type { MemberTitle } from '../entities/member-title.entity';

export interface IMemberTitleRepository {
  findById(id: string): Promise<MemberTitle | null>;
  /** Todos os títulos de um Irmão (não excluídos) — base da aba "Trajetória e Honrarias". */
  listByMemberId(tenantId: string, memberId: string): Promise<MemberTitle[]>;
  create(title: MemberTitle): Promise<void>;
  /** Lixeira — soft delete, nunca exclusão física (ver `BaseEntity`). */
  softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void>;
}
