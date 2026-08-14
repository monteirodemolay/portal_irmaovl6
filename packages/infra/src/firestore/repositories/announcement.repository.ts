import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { Announcement, IAnnouncementRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'announcements';
const DATE_FIELDS = ['dataPublicacao', 'dataExpiracao'] as const;

export class FirestoreAnnouncementRepository implements IAnnouncementRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<Announcement>(DATE_FIELDS));
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
        .where('deletedAt', '==', null)
        .where('dataExpiracao', '==', null)
        .get(),
      this.collection
        .where('tenantId', '==', tenantId)
        .where('publicado', '==', true)
        .where('deletedAt', '==', null)
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
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listAll(tenantId: string): Promise<Announcement[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async countPublishedByTenant(tenantId: string): Promise<number> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('publicado', '==', true)
      .where('deletedAt', '==', null)
      .count()
      .get();
    return snap.data().count;
  }

  async create(announcement: Announcement): Promise<void> {
    await this.collection.doc(announcement.id).set(announcement);
  }

  async update(announcement: Announcement): Promise<void> {
    await this.collection.doc(announcement.id).set(announcement);
  }
}
