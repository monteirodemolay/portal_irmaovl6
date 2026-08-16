import type { Firestore } from 'firebase-admin/firestore';
import type { ArchiveContribution, IArchiveContributionRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'archiveContributions';

export class FirestoreArchiveContributionRepository implements IArchiveContributionRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<ArchiveContribution>([]));
  }

  async findById(id: string): Promise<ArchiveContribution | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByTenant(tenantId: string): Promise<ArchiveContribution[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listByMember(tenantId: string, memberId: string): Promise<ArchiveContribution[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('memberId', '==', memberId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(contribution: ArchiveContribution): Promise<void> {
    await this.collection.doc(contribution.id).set(contribution);
  }

  async update(contribution: ArchiveContribution): Promise<void> {
    await this.collection.doc(contribution.id).set(contribution);
  }
}
