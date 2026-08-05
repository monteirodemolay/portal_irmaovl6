import type { Firestore } from 'firebase-admin/firestore';
import type { IMemberPositionHistoryRepository, MemberPositionHistory } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'memberPositionHistory';

export class FirestoreMemberPositionHistoryRepository implements IMemberPositionHistoryRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<MemberPositionHistory>());
  }

  async findActiveByMemberId(memberId: string): Promise<MemberPositionHistory | null> {
    const snap = await this.collection
      .where('memberId', '==', memberId)
      .where('dataFim', '==', null)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listByMemberId(memberId: string): Promise<MemberPositionHistory[]> {
    const snap = await this.collection.where('memberId', '==', memberId).get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(entry: MemberPositionHistory): Promise<void> {
    await this.collection.doc(entry.id).set(entry);
  }

  async update(entry: MemberPositionHistory): Promise<void> {
    await this.collection.doc(entry.id).set(entry);
  }
}
