import type { Firestore } from 'firebase-admin/firestore';
import type { ArchiveCollection, IArchiveCollectionRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'archiveCollections';

export class FirestoreArchiveCollectionRepository implements IArchiveCollectionRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<ArchiveCollection>([]));
  }

  async findById(id: string): Promise<ArchiveCollection | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findBySlugAndTenant(tenantId: string, slug: string): Promise<ArchiveCollection | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('slug', '==', slug)
      .where('deletedAt', '==', null)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listByTenant(tenantId: string): Promise<ArchiveCollection[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('ordem', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listPublishedByTenant(tenantId: string): Promise<ArchiveCollection[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('publicado', '==', true)
      .orderBy('ordem', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(collection: ArchiveCollection): Promise<void> {
    await this.collection.doc(collection.id).set(collection);
  }

  async update(collection: ArchiveCollection): Promise<void> {
    await this.collection.doc(collection.id).set(collection);
  }
}
