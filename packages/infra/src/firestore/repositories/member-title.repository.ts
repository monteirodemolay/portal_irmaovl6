import type { Firestore } from 'firebase-admin/firestore';
import type { IMemberTitleRepository, MemberTitle } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'memberTitles';

export class FirestoreMemberTitleRepository implements IMemberTitleRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<MemberTitle>(['dataConcessao']));
  }

  async findById(id: string): Promise<MemberTitle | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByMemberId(tenantId: string, memberId: string): Promise<MemberTitle[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('memberId', '==', memberId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(title: MemberTitle): Promise<void> {
    await this.collection.doc(title.id).set(title);
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
