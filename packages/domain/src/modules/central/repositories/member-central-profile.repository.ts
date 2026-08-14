import type { MemberCentralProfile } from '../entities/member-central-profile.entity';

export interface IMemberCentralProfileRepository {
  findById(id: string): Promise<MemberCentralProfile | null>;
  findByMemberId(tenantId: string, memberId: string): Promise<MemberCentralProfile | null>;
  create(profile: MemberCentralProfile): Promise<void>;
  update(profile: MemberCentralProfile): Promise<void>;
}
