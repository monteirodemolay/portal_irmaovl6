import {
  Timestamp,
  type Firestore,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import type { ITenantDomainVerificationRepository, TenantDomainVerification } from '@vl6/domain';

const COLLECTION = 'tenantDomainVerifications';

/**
 * `TenantDomainVerification` não estende `BaseEntity` (registro de
 * processo, não entidade de negócio) — converter dedicado, mesmo
 * raciocínio de `auditLogConverter`.
 */
const converter: FirestoreDataConverter<TenantDomainVerification> = {
  toFirestore(entry: TenantDomainVerification) {
    const { id: _id, ...rest } = entry;
    return {
      ...rest,
      createdAt: Timestamp.fromDate(entry.createdAt),
      verifiedAt: entry.verifiedAt ? Timestamp.fromDate(entry.verifiedAt) : null,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): TenantDomainVerification {
    const data = snapshot.data() as Omit<
      TenantDomainVerification,
      'id' | 'createdAt' | 'verifiedAt'
    > & {
      createdAt: Timestamp;
      verifiedAt: Timestamp | null;
    };
    return {
      ...data,
      id: snapshot.id,
      createdAt: data.createdAt.toDate(),
      verifiedAt: data.verifiedAt ? data.verifiedAt.toDate() : null,
    };
  },
};

export class FirestoreTenantDomainVerificationRepository implements ITenantDomainVerificationRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(converter);
  }

  async findByDomain(domain: string): Promise<TenantDomainVerification | null> {
    const snap = await this.collection.doc(domain).get();
    return snap.exists ? snap.data()! : null;
  }

  async findByTenantId(tenantId: string): Promise<TenantDomainVerification | null> {
    const snap = await this.collection.where('tenantId', '==', tenantId).limit(1).get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async create(entry: TenantDomainVerification): Promise<void> {
    await this.collection.doc(entry.id).set(entry);
  }

  async update(entry: TenantDomainVerification): Promise<void> {
    await this.collection.doc(entry.id).set(entry);
  }
}
