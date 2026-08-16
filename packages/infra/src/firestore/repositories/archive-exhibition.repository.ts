import type { Firestore } from 'firebase-admin/firestore';
import type { ArchiveExhibition, IArchiveExhibitionRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'archiveExhibitions';

export class FirestoreArchiveExhibitionRepository implements IArchiveExhibitionRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<ArchiveExhibition>([]));
  }

  async findById(id: string): Promise<ArchiveExhibition | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findBySlugAndTenant(tenantId: string, slug: string): Promise<ArchiveExhibition | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('slug', '==', slug)
      .where('deletedAt', '==', null)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listByTenant(tenantId: string): Promise<ArchiveExhibition[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('ordem', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listPublishedByTenant(tenantId: string): Promise<ArchiveExhibition[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .where('publicado', '==', true)
      .orderBy('ordem', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(exhibition: ArchiveExhibition): Promise<void> {
    await this.collection.doc(exhibition.id).set(exhibition);
  }

  async update(exhibition: ArchiveExhibition): Promise<void> {
    await this.collection.doc(exhibition.id).set(exhibition);
  }
}
