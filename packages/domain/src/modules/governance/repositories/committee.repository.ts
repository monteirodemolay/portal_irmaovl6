import type { Committee } from '../entities/committee.entity';

export interface ICommitteeRepository {
  findById(id: string): Promise<Committee | null>;
  listByGestao(gestaoId: string): Promise<Committee[]>;
  listByMemberId(tenantId: string, memberId: string): Promise<Committee[]>;
  create(committee: Committee): Promise<void>;
  update(committee: Committee): Promise<void>;
}
