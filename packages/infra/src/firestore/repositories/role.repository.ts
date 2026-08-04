import type { Firestore } from 'firebase-admin/firestore';
import type { IRoleRepository, Role } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'roles';

export class FirestoreRoleRepository implements IRoleRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(createEntityConverter<Role>());
  }

  async findById(id: string): Promise<Role | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findByKey(tenantId: string, chave: string): Promise<Role | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('chave', '==', chave)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listByTenant(tenantId: string): Promise<Role[]> {
    const snap = await this.collection.where('tenantId', '==', tenantId).get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(role: Role): Promise<void> {
    await this.collection.doc(role.id).set(role);
  }

  async update(role: Role): Promise<void> {
    await this.collection.doc(role.id).set(role);
  }
}
