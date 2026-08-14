import type { Firestore } from 'firebase-admin/firestore';
import type {
  IPublicationSettingsRepository,
  PublicationSettings,
  PublishedMemberRef,
} from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'publicationSettings';
const DATE_FIELDS = ['suspendedAt'] as const;

export class FirestorePublicationSettingsRepository implements IPublicationSettingsRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<PublicationSettings>(DATE_FIELDS));
  }

  async findById(id: string): Promise<PublicationSettings | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findByMemberId(tenantId: string, memberId: string): Promise<PublicationSettings | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('memberId', '==', memberId)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listPublishedByTenant(tenantId: string): Promise<PublishedMemberRef[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('profilePublished', '==', true)
      .where('suspendedAt', '==', null)
      .get();
    return snap.docs.map((doc) => ({ memberId: doc.data().memberId }));
  }

  async listByTenant(tenantId: string): Promise<PublicationSettings[]> {
    const snap = await this.collection.where('tenantId', '==', tenantId).get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(settings: PublicationSettings): Promise<void> {
    await this.collection.doc(settings.id).set(settings);
  }

  async update(settings: PublicationSettings): Promise<void> {
    await this.collection.doc(settings.id).set(settings);
  }
}
