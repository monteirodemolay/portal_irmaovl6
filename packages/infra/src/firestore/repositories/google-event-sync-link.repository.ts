import type { Firestore } from 'firebase-admin/firestore';
import type {
  GoogleEventSyncLink,
  GoogleSyncSourceType,
  IGoogleEventSyncLinkRepository,
} from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'googleEventSyncLinks';

export class FirestoreGoogleEventSyncLinkRepository implements IGoogleEventSyncLinkRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<GoogleEventSyncLink>());
  }

  async findBySource(
    tenantId: string,
    userId: string,
    sourceType: GoogleSyncSourceType,
    sourceId: string,
  ): Promise<GoogleEventSyncLink | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .where('sourceType', '==', sourceType)
      .where('sourceId', '==', sourceId)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async create(link: GoogleEventSyncLink): Promise<void> {
    await this.collection.doc(link.id).set(link);
  }

  /** Exclusão física, deliberada — o link só tem sentido enquanto o espelhamento existe. */
  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
