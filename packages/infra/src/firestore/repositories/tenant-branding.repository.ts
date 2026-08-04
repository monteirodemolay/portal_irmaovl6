import type { Firestore } from 'firebase-admin/firestore';
import type { ITenantBrandingRepository, TenantBranding } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'tenantBranding';

export class FirestoreTenantBrandingRepository implements ITenantBrandingRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<TenantBranding>());
  }

  async findByTenantId(tenantId: string): Promise<TenantBranding | null> {
    const snap = await this.collection.where('tenantId', '==', tenantId).limit(1).get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async create(branding: TenantBranding): Promise<void> {
    await this.collection.doc(branding.id).set(branding);
  }

  async update(branding: TenantBranding): Promise<void> {
    await this.collection.doc(branding.id).set(branding);
  }
}
