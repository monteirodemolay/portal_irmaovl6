import type { Firestore } from 'firebase-admin/firestore';
import type { IMemberAccessClaimRepository, MemberAccessClaim } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'memberAccessClaims';
const DATE_FIELDS = ['revisadoEm'] as const;

export class FirestoreMemberAccessClaimRepository implements IMemberAccessClaimRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<MemberAccessClaim>(DATE_FIELDS));
  }

  async findById(id: string): Promise<MemberAccessClaim | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findPendingByMember(tenantId: string, memberId: string): Promise<MemberAccessClaim | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('memberId', '==', memberId)
      .where('revisaoStatus', '==', 'pendente')
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listPendingByTenant(tenantId: string): Promise<MemberAccessClaim[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('revisaoStatus', '==', 'pendente')
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(claim: MemberAccessClaim): Promise<void> {
    await this.collection.doc(claim.id).set(claim);
  }

  async update(claim: MemberAccessClaim): Promise<void> {
    await this.collection.doc(claim.id).set(claim);
  }
}
