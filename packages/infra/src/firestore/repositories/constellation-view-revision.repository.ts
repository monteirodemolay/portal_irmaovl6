import {
  Timestamp,
  type Firestore,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import type { ConstellationViewRevision, IConstellationViewRevisionRepository } from '@vl6/domain';

const COLLECTION = 'constellationViewRevisions';

/**
 * `ConstellationViewRevision` não estende `BaseEntity` (é append-only, sem
 * soft delete) — mesmo padrão de `AuditLog`. `filters.from`/`filters.to`
 * são datas ANINHADAS dentro de `filters`, convertidas à parte (mesma
 * classe de bug já vista em `MemberCentralProfile.negocios[].updatedAt`).
 */
const revisionConverter: FirestoreDataConverter<ConstellationViewRevision> = {
  toFirestore(revision: ConstellationViewRevision) {
    const { id: _id, ...rest } = revision;
    return {
      ...rest,
      createdAt: Timestamp.fromDate(revision.createdAt),
      filters: {
        kinds: revision.filters.kinds,
        from: revision.filters.from ? Timestamp.fromDate(revision.filters.from) : null,
        to: revision.filters.to ? Timestamp.fromDate(revision.filters.to) : null,
      },
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): ConstellationViewRevision {
    const data = snapshot.data() as Omit<ConstellationViewRevision, 'id' | 'createdAt'> & {
      createdAt: Timestamp;
    };
    return {
      ...data,
      id: snapshot.id,
      createdAt: data.createdAt.toDate(),
      filters: {
        kinds: data.filters.kinds,
        from:
          data.filters.from instanceof Timestamp ? data.filters.from.toDate() : data.filters.from,
        to: data.filters.to instanceof Timestamp ? data.filters.to.toDate() : data.filters.to,
      },
    };
  },
};

export class FirestoreConstellationViewRevisionRepository implements IConstellationViewRevisionRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(revisionConverter);
  }

  async create(revision: ConstellationViewRevision): Promise<void> {
    await this.collection.doc(revision.id).set(revision);
  }

  /** Só filtros de igualdade — sem `orderBy`, não exige índice composto novo (ordenação feita no use case). */
  async listByView(tenantId: string, viewId: string): Promise<ConstellationViewRevision[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('viewId', '==', viewId)
      .get();
    return snap.docs.map((doc) => doc.data());
  }
}
