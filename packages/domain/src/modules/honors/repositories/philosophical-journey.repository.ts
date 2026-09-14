import type { PhilosophicalJourney } from '../entities/philosophical-journey.entity';

export interface IPhilosophicalJourneyRepository {
  findById(id: string): Promise<PhilosophicalJourney | null>;
  listByMemberId(tenantId: string, memberId: string): Promise<PhilosophicalJourney[]>;
  create(journey: PhilosophicalJourney): Promise<void>;
  softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void>;
}
