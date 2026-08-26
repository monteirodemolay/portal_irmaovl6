import type { MemberCentralProfile } from '../entities/member-central-profile.entity';

export interface IMemberCentralProfileRepository {
  findById(id: string): Promise<MemberCentralProfile | null>;
  findByMemberId(tenantId: string, memberId: string): Promise<MemberCentralProfile | null>;
  /** Todos os perfis do tenant, publicados ou não — moderação de negócios precisa ver rascunhos. */
  listByTenant(tenantId: string): Promise<MemberCentralProfile[]>;
  create(profile: MemberCentralProfile): Promise<void>;
  update(profile: MemberCentralProfile): Promise<void>;
}
