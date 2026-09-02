import type { FamilyPerson } from '../entities/family-person.entity';

export interface IFamilyPersonRepository {
  findById(id: string): Promise<FamilyPerson | null>;
  findByLinkedMemberId(tenantId: string, memberId: string): Promise<FamilyPerson | null>;
  /** Busca por nome normalizado — base da tela de deduplicação (04_TELAS_E_FLUXOS.md §3). */
  searchByNormalizedName(
    tenantId: string,
    nomeBusca: string,
    limit: number,
  ): Promise<FamilyPerson[]>;
  listManagedByMember(tenantId: string, memberId: string): Promise<FamilyPerson[]>;
  listByIds(tenantId: string, ids: string[]): Promise<FamilyPerson[]>;
  create(entity: FamilyPerson): Promise<void>;
  update(entity: FamilyPerson): Promise<void>;
}
