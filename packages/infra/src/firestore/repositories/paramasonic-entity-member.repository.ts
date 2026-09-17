import type { Firestore } from 'firebase-admin/firestore';
import type { IParamasonicEntityMemberRepository, ParamasonicEntityMember } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'paramasonicEntityMembers';

export class FirestoreParamasonicEntityMemberRepository implements IParamasonicEntityMemberRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<ParamasonicEntityMember>(['dataIngresso']));
  }

  async findById(id: string): Promise<ParamasonicEntityMember | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByEntity(tenantId: string, entityId: string): Promise<ParamasonicEntityMember[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('entityId', '==', entityId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(entity: ParamasonicEntityMember): Promise<void> {
    await this.collection.doc(entity.id).set(entity);
  }

  async update(entity: ParamasonicEntityMember): Promise<void> {
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
