import type { Firestore } from 'firebase-admin/firestore';
import type { FamilyRelationship, IFamilyRelationshipRepository } from '@vl6/domain';
import type { FamilyPersonRefKind } from '@vl6/shared';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'familyRelationships';

export class FirestoreFamilyRelationshipRepository implements IFamilyRelationshipRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(
        createEntityConverter<FamilyRelationship>(['confirmedAt', 'validFrom', 'validTo']),
      );
  }

  async findById(id: string): Promise<FamilyRelationship | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByEndpoint(
    tenantId: string,
    kind: FamilyPersonRefKind,
    id: string,
  ): Promise<FamilyRelationship[]> {
    const [asFrom, asTo] = await Promise.all([
      this.collection
        .where('tenantId', '==', tenantId)
        .where('deletedAt', '==', null)
        .where('fromKind', '==', kind)
        .where('fromId', '==', id)
        .get(),
      this.collection
        .where('tenantId', '==', tenantId)
        .where('deletedAt', '==', null)
        .where('toKind', '==', kind)
        .where('toId', '==', id)
        .get(),
    ]);

    const byId = new Map<string, FamilyRelationship>();
    for (const doc of [...asFrom.docs, ...asTo.docs]) {
      byId.set(doc.id, doc.data());
    }
    return [...byId.values()];
  }

  async listByTenant(tenantId: string): Promise<FamilyRelationship[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async findEquivalent(
    tenantId: string,
    relation: Pick<FamilyRelationship, 'fromKind' | 'fromId' | 'toKind' | 'toId' | 'relationKind'>,
  ): Promise<FamilyRelationship | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('fromKind', '==', relation.fromKind)
      .where('fromId', '==', relation.fromId)
      .where('toKind', '==', relation.toKind)
      .where('toId', '==', relation.toId)
      .where('relationKind', '==', relation.relationKind)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async create(entity: FamilyRelationship): Promise<void> {
    await this.collection.doc(entity.id).set(entity);
  }

  async update(entity: FamilyRelationship): Promise<void> {
    await this.collection.doc(entity.id).set(entity);
  }
}
