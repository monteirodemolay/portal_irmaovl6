import type { Firestore } from 'firebase-admin/firestore';
import type { FileCategory, IFileCategoryRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'fileCategories';

export class FirestoreFileCategoryRepository implements IFileCategoryRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<FileCategory>());
  }

  async findById(id: string): Promise<FileCategory | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByTenant(tenantId: string): Promise<FileCategory[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('ordem', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(category: FileCategory): Promise<void> {
    await this.collection.doc(category.id).set(category);
  }

  async update(category: FileCategory): Promise<void> {
    await this.collection.doc(category.id).set(category);
  }
}
