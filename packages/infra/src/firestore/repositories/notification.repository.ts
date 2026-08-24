import type { Firestore } from 'firebase-admin/firestore';
import type { INotificationRepository, Notification, PageRequest, PageResult } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'notifications';
const DATE_FIELDS = ['readAt', 'archivedAt', 'acknowledgedAt', 'expiresAt'] as const;

export class FirestoreNotificationRepository implements INotificationRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<Notification>(DATE_FIELDS));
  }

  async findById(id: string): Promise<Notification | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByRecipient(
    tenantId: string,
    destinatarioId: string,
    page: PageRequest,
  ): Promise<PageResult<Notification>> {
    let query = this.collection
      .where('tenantId', '==', tenantId)
      .where('destinatarioId', '==', destinatarioId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc');

    if (page.cursor) {
      const cursorDoc = await this.collection.doc(page.cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }
    const snap = await query.limit(page.limit + 1).get();
    const docs = snap.docs.slice(0, page.limit);
    const hasMore = snap.docs.length > page.limit;
    return {
      items: docs.map((doc) => doc.data()),
      nextCursor: hasMore ? (docs.at(-1)?.id ?? null) : null,
      hasMore,
    };
  }

  async countUnreadByRecipient(tenantId: string, destinatarioId: string): Promise<number> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('destinatarioId', '==', destinatarioId)
      .where('lida', '==', false)
      .where('deletedAt', '==', null)
      .count()
      .get();
    return snap.data().count;
  }

  async findByDedupeKey(tenantId: string, dedupeKey: string): Promise<Notification | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('dedupeKey', '==', dedupeKey)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listExpiringUnarchived(tenantId: string, at: Date): Promise<Notification[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('archivedAt', '==', null)
      .where('deletedAt', '==', null)
      .where('expiresAt', '<=', at)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listByDedupeKeyPrefix(tenantId: string, prefix: string): Promise<Notification[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('dedupeKey', '>=', prefix)
      .where('dedupeKey', '<', `${prefix}`)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(notification: Notification): Promise<void> {
    await this.collection.doc(notification.id).set(notification);
  }

  async update(notification: Notification): Promise<void> {
    await this.collection.doc(notification.id).set(notification);
  }
}
