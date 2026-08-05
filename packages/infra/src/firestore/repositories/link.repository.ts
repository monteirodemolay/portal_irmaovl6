import type { Firestore } from 'firebase-admin/firestore';
import type { ILinkRepository, Link } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'links';

export class FirestoreLinkRepository implements ILinkRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(createEntityConverter<Link>());
  }

  async findById(id: string): Promise<Link | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listActive(tenantId: string): Promise<Link[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('ativo', '==', true)
      .orderBy('ordem', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listAll(tenantId: string): Promise<Link[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('ordem', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(link: Link): Promise<void> {
    await this.collection.doc(link.id).set(link);
  }

  async update(link: Link): Promise<void> {
    await this.collection.doc(link.id).set(link);
  }
}
