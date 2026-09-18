import type { Firestore } from 'firebase-admin/firestore';
import type { IParamasonicEntityRepository, ParamasonicEntity } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'paramasonicEntities';

export class FirestoreParamasonicEntityRepository implements IParamasonicEntityRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<ParamasonicEntity>());
  }

  async findById(id: string): Promise<ParamasonicEntity | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByTenant(tenantId: string): Promise<ParamasonicEntity[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(entity: ParamasonicEntity): Promise<void> {
    await this.collection.doc(entity.id).set(entity);
  }

  async update(entity: ParamasonicEntity): Promise<void> {
    await this.collection.doc(entity.id).set(entity);
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
