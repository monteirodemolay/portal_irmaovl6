import type { Firestore } from 'firebase-admin/firestore';
import type { GoogleCalendarEventCache, IGoogleCalendarEventCacheRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'googleCalendarEvents';
const DATE_FIELDS = ['inicio', 'fim'] as const;

export class FirestoreGoogleCalendarEventCacheRepository implements IGoogleCalendarEventCacheRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<GoogleCalendarEventCache>(DATE_FIELDS));
  }

  async listByUser(tenantId: string, userId: string): Promise<GoogleCalendarEventCache[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async upsert(event: GoogleCalendarEventCache): Promise<void> {
    await this.collection.doc(event.id).set(event);
  }

  async deleteByGoogleEventId(
    tenantId: string,
    userId: string,
    googleEventId: string,
  ): Promise<void> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .where('googleEventId', '==', googleEventId)
      .limit(1)
      .get();
    if (!snap.empty) {
      await snap.docs[0]!.ref.delete();
    }
  }
}
