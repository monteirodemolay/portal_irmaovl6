import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { Announcement, IAnnouncementRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'announcements';

export class FirestoreAnnouncementRepository implements IAnnouncementRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<Announcement>());
  }

  async findById(id: string): Promise<Announcement | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listActive(tenantId: string, at: Date = new Date()): Promise<Announcement[]> {
    // Firestore não faz "campo == null OU campo >= x" numa única query — duas
    // consultas mescladas (sem expiração / expiração futura) resolvem sem
    // exigir um índice composto com filtro OR.
    const [semExpiracao, comExpiracaoFutura] = await Promise.all([
      this.collection
        .where('tenantId', '==', tenantId)
        .where('publicado', '==', true)
        .where('dataExpiracao', '==', null)
        .get(),
      this.collection
        .where('tenantId', '==', tenantId)
        .where('publicado', '==', true)
        .where('dataExpiracao', '>=', Timestamp.fromDate(at))
        .get(),
    ]);

    const byId = new Map<string, Announcement>();
    for (const doc of [...semExpiracao.docs, ...comExpiracaoFutura.docs]) {
      byId.set(doc.id, doc.data());
    }
    return [...byId.values()];
  }

  async listHighlighted(tenantId: string): Promise<Announcement[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('destacar', '==', true)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listAll(tenantId: string): Promise<Announcement[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(announcement: Announcement): Promise<void> {
    await this.collection.doc(announcement.id).set(announcement);
  }

  async update(announcement: Announcement): Promise<void> {
    await this.collection.doc(announcement.id).set(announcement);
  }
}
