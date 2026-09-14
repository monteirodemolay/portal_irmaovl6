import type { Firestore } from 'firebase-admin/firestore';
import type { Honor, IHonorRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'honors';

export class FirestoreHonorRepository implements IHonorRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<Honor>(['data']));
  }

  async findById(id: string): Promise<Honor | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByMemberId(tenantId: string, memberId: string): Promise<Honor[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('memberId', '==', memberId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listByTenant(tenantId: string): Promise<Honor[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(honor: Honor): Promise<void> {
    await this.collection.doc(honor.id).set(honor);
  }

  async softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void> {
    await this.collection.doc(id).update({
      deletedAt,
      updatedAt: deletedAt,
      updatedBy,
      status: 'archived',
      ativo: false,
    });
  }
}
