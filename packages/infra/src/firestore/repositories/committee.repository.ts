import type { Firestore } from 'firebase-admin/firestore';
import type { Committee, ICommitteeRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'committees';

export class FirestoreCommitteeRepository implements ICommitteeRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(createEntityConverter<Committee>());
  }

  async findById(id: string): Promise<Committee | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByGestao(gestaoId: string): Promise<Committee[]> {
    const snap = await this.collection.where('gestaoId', '==', gestaoId).get();
    return snap.docs.map((doc) => doc.data());
  }

  async listByMemberId(tenantId: string, memberId: string): Promise<Committee[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('membrosIds', 'array-contains', memberId)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(committee: Committee): Promise<void> {
    await this.collection.doc(committee.id).set(committee);
  }

  async update(committee: Committee): Promise<void> {
    await this.collection.doc(committee.id).set(committee);
  }
}
