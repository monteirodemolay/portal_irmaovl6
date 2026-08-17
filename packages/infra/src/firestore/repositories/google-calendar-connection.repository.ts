import type { Firestore } from 'firebase-admin/firestore';
import type { GoogleCalendarConnection, IGoogleCalendarConnectionRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'googleCalendarConnections';
const DATE_FIELDS = ['accessTokenExpiresAt', 'lastSyncedAt'] as const;

export class FirestoreGoogleCalendarConnectionRepository implements IGoogleCalendarConnectionRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<GoogleCalendarConnection>(DATE_FIELDS));
  }

  async findByUserId(tenantId: string, userId: string): Promise<GoogleCalendarConnection | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async create(connection: GoogleCalendarConnection): Promise<void> {
    await this.collection.doc(connection.id).set(connection);
  }

  async update(connection: GoogleCalendarConnection): Promise<void> {
    await this.collection.doc(connection.id).set(connection);
  }

  /** Exclusão física, deliberada — ausência de documento = "não conectado". */
  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
