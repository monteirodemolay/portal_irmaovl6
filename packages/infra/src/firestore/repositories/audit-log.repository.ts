import {
  Timestamp,
  type Firestore,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import type {
  AuditLog,
  AuditLogFilters,
  IAuditLogRepository,
  PageRequest,
  PageResult,
} from '@vl6/domain';

const COLLECTION = 'auditLogs';

/**
 * `AuditLog` não estende `BaseEntity` (é append-only, sem os campos de
 * soft delete) — por isso usa um converter dedicado em vez de
 * `createEntityConverter`, que assume o formato de `BaseEntity`.
 */
const auditLogConverter: FirestoreDataConverter<AuditLog> = {
  toFirestore(entry: AuditLog) {
    const { id: _id, ...rest } = entry;
    return { ...rest, timestamp: Timestamp.fromDate(entry.timestamp) };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): AuditLog {
    const data = snapshot.data() as Omit<AuditLog, 'id' | 'timestamp'> & { timestamp: Timestamp };
    return { ...data, id: snapshot.id, timestamp: data.timestamp.toDate() };
  },
};

export class FirestoreAuditLogRepository implements IAuditLogRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(auditLogConverter);
  }

  /** Único método de escrita — nunca update/delete (docs/architecture/06 §6.7). */
  async append(entry: AuditLog): Promise<void> {
    await this.collection.doc(entry.id).set(entry);
  }

  async search(filters: AuditLogFilters, page: PageRequest): Promise<PageResult<AuditLog>> {
    let query = this.collection
      .where('tenantId', '==', filters.tenantId)
      .orderBy('timestamp', 'desc');

    if (filters.entidade) query = query.where('entidade', '==', filters.entidade);
    if (filters.entidadeId) query = query.where('entidadeId', '==', filters.entidadeId);

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
}
