import type { Firestore } from 'firebase-admin/firestore';
import type { IParamasonicEntityPositionRepository, ParamasonicEntityPosition } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'paramasonicEntityPositions';

export class FirestoreParamasonicEntityPositionRepository implements IParamasonicEntityPositionRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<ParamasonicEntityPosition>());
  }

  async findById(id: string): Promise<ParamasonicEntityPosition | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByEntity(tenantId: string, entityId: string): Promise<ParamasonicEntityPosition[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('entityId', '==', entityId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(position: ParamasonicEntityPosition): Promise<void> {
    await this.collection.doc(position.id).set(position);
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
