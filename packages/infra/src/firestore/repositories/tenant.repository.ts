import type { Firestore } from 'firebase-admin/firestore';
import type { ITenantRepository, Tenant } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'tenants';

export class FirestoreTenantRepository implements ITenantRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(createEntityConverter<Tenant>());
  }

  async findById(id: string): Promise<Tenant | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findByDomain(domain: string): Promise<Tenant | null> {
    const snap = await this.collection.where('dominio', '==', domain).limit(1).get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    const snap = await this.collection.where('subdominio', '==', subdomain).limit(1).get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async existsBySubdomain(subdomain: string): Promise<boolean> {
    const snap = await this.collection.where('subdominio', '==', subdomain).limit(1).get();
    return !snap.empty;
  }

  async create(tenant: Tenant): Promise<void> {
    await this.collection.doc(tenant.id).set(tenant);
  }

  async update(tenant: Tenant): Promise<void> {
    await this.collection.doc(tenant.id).set(tenant);
  }
}
