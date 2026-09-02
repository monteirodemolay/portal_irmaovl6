import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { ConstellationView, IConstellationViewRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'constellationViews';

const baseConverter = createEntityConverter<ConstellationView>();

/**
 * `createEntityConverter` só converte Timestamp↔Date em campos de topo —
 * `filters.from`/`filters.to` são datas ANINHADAS dentro de `filters`, que
 * ficariam como `Timestamp` cru sem esse passo extra (mesma classe de bug
 * já vista em `MemberCentralProfile.negocios[].updatedAt`).
 */
export class FirestoreConstellationViewRepository implements IConstellationViewRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter({
      toFirestore: (view: ConstellationView) => ({
        ...baseConverter.toFirestore(view),
        filters: {
          kinds: view.filters.kinds,
          from: view.filters.from ? Timestamp.fromDate(view.filters.from) : null,
          to: view.filters.to ? Timestamp.fromDate(view.filters.to) : null,
        },
      }),
      fromFirestore: (snapshot: Parameters<typeof baseConverter.fromFirestore>[0]) => {
        const view = baseConverter.fromFirestore(snapshot);
        return {
          ...view,
          filters: {
            kinds: view.filters.kinds,
            from:
              view.filters.from instanceof Timestamp
                ? view.filters.from.toDate()
                : view.filters.from,
            to: view.filters.to instanceof Timestamp ? view.filters.to.toDate() : view.filters.to,
          },
        };
      },
    });
  }

  async findById(id: string): Promise<ConstellationView | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByOwner(tenantId: string, ownerId: string): Promise<ConstellationView[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('ownerId', '==', ownerId)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(view: ConstellationView): Promise<void> {
    await this.collection.doc(view.id).set(view);
  }

  async update(view: ConstellationView): Promise<void> {
    await this.collection.doc(view.id).set(view);
  }
}
