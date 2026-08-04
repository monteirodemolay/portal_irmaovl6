import type { Firestore } from 'firebase-admin/firestore';
import type { ITenantSettingsRepository, TenantSettings } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'tenantSettings';

export class FirestoreTenantSettingsRepository implements ITenantSettingsRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<TenantSettings>());
  }

  async findByTenantId(tenantId: string): Promise<TenantSettings | null> {
    const snap = await this.collection.where('tenantId', '==', tenantId).limit(1).get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async create(settings: TenantSettings): Promise<void> {
    await this.collection.doc(settings.id).set(settings);
  }

  async update(settings: TenantSettings): Promise<void> {
    await this.collection.doc(settings.id).set(settings);
  }
}
