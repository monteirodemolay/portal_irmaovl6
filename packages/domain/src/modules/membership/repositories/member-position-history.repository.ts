import type { MemberPositionHistory } from '../entities/member-position-history.entity';

export interface IMemberPositionHistoryRepository {
  findActiveByMemberId(memberId: string): Promise<MemberPositionHistory | null>;
  listByMemberId(memberId: string): Promise<MemberPositionHistory[]>;
  create(entry: MemberPositionHistory): Promise<void>;
  update(entry: MemberPositionHistory): Promise<void>;
}
