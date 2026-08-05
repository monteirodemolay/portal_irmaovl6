import type { Firestore } from 'firebase-admin/firestore';
import type { INotificationPreferenceRepository, NotificationPreference } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'notificationPreferences';

export class FirestoreNotificationPreferenceRepository implements INotificationPreferenceRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<NotificationPreference>());
  }

  async findByUserId(tenantId: string, userId: string): Promise<NotificationPreference | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async create(preference: NotificationPreference): Promise<void> {
    await this.collection.doc(preference.id).set(preference);
  }

  async update(preference: NotificationPreference): Promise<void> {
    await this.collection.doc(preference.id).set(preference);
  }
}
