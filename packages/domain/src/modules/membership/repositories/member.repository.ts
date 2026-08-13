import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { Member } from '../entities/member.entity';

export interface MemberSearchFilters {
  tenantId: string;
  nome?: string;
  grau?: string;
  situacao?: string;
  cidade?: string;
  cim?: string;
}

export interface IMemberRepository {
  findById(id: string): Promise<Member | null>;
  findByUserId(tenantId: string, userId: string): Promise<Member | null>;
  existsByCim(tenantId: string, cim: string): Promise<boolean>;
  search(filters: MemberSearchFilters, page: PageRequest): Promise<PageResult<Member>>;
  /** Total de Irmãos cadastrados (não excluídos) — usado pelo Painel administrativo. */
  countByTenant(tenantId: string): Promise<number>;
  create(member: Member): Promise<void>;
  update(member: Member): Promise<void>;
}
