import type { Firestore } from 'firebase-admin/firestore';
import type { IMemberCentralProfileRepository, MemberCentralProfile } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'memberCentralProfiles';

export class FirestoreMemberCentralProfileRepository implements IMemberCentralProfileRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<MemberCentralProfile>());
  }

  async findById(id: string): Promise<MemberCentralProfile | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findByMemberId(tenantId: string, memberId: string): Promise<MemberCentralProfile | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('memberId', '==', memberId)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async create(profile: MemberCentralProfile): Promise<void> {
    await this.collection.doc(profile.id).set(profile);
  }

  async update(profile: MemberCentralProfile): Promise<void> {
    await this.collection.doc(profile.id).set(profile);
  }
}
