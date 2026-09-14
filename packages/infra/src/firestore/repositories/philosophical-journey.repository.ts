import type { Firestore } from 'firebase-admin/firestore';
import type { IPhilosophicalJourneyRepository, PhilosophicalJourney } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'philosophicalJourneys';

export class FirestorePhilosophicalJourneyRepository implements IPhilosophicalJourneyRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<PhilosophicalJourney>(['data']));
  }

  async findById(id: string): Promise<PhilosophicalJourney | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByMemberId(tenantId: string, memberId: string): Promise<PhilosophicalJourney[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('memberId', '==', memberId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(journey: PhilosophicalJourney): Promise<void> {
    await this.collection.doc(journey.id).set(journey);
  }

  async softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void> {
    await this.collection.doc(id).update({
      deletedAt,
      updatedAt: deletedAt,
      updatedBy,
      status: 'archived',
      ativo: false,
    });
  }
}
