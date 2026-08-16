import type { Firestore } from 'firebase-admin/firestore';
import type { ArchiveRelation, IArchiveRelationRepository } from '@vl6/domain';
import type { ArchiveRelationNodeKind } from '@vl6/shared';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'archiveRelations';

export class FirestoreArchiveRelationRepository implements IArchiveRelationRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<ArchiveRelation>([]));
  }

  async findById(id: string): Promise<ArchiveRelation | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByTenant(tenantId: string): Promise<ArchiveRelation[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listByNode(
    tenantId: string,
    nodeTipo: ArchiveRelationNodeKind,
    nodeId: string,
  ): Promise<ArchiveRelation[]> {
    const [asOrigem, asDestino] = await Promise.all([
      this.collection
        .where('tenantId', '==', tenantId)
        .where('deletedAt', '==', null)
        .where('origemTipo', '==', nodeTipo)
        .where('origemId', '==', nodeId)
        .get(),
      this.collection
        .where('tenantId', '==', tenantId)
        .where('deletedAt', '==', null)
        .where('destinoTipo', '==', nodeTipo)
        .where('destinoId', '==', nodeId)
        .get(),
    ]);

    const byId = new Map<string, ArchiveRelation>();
    for (const doc of [...asOrigem.docs, ...asDestino.docs]) {
      byId.set(doc.id, doc.data());
    }
    return [...byId.values()];
  }

  async create(relation: ArchiveRelation): Promise<void> {
    await this.collection.doc(relation.id).set(relation);
  }

  async update(relation: ArchiveRelation): Promise<void> {
    await this.collection.doc(relation.id).set(relation);
  }
}
