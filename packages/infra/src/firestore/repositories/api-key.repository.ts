import type { Firestore } from 'firebase-admin/firestore';
import type { ApiKey, IApiKeyRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'apiKeys';

export class FirestoreApiKeyRepository implements IApiKeyRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(createEntityConverter<ApiKey>());
  }

  async findById(id: string): Promise<ApiKey | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  /** Sem filtro de tenantId de propósito — ver comentário na interface. */
  async findByHash(keyHash: string): Promise<ApiKey | null> {
    const snap = await this.collection.where('keyHash', '==', keyHash).limit(1).get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listByTenant(tenantId: string): Promise<ApiKey[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(apiKey: ApiKey): Promise<void> {
    await this.collection.doc(apiKey.id).set(apiKey);
  }

  async update(apiKey: ApiKey): Promise<void> {
    await this.collection.doc(apiKey.id).set(apiKey);
  }
}
