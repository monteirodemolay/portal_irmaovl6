import type { Firestore } from 'firebase-admin/firestore';
import type { ILibraryCategoryRepository, LibraryCategory } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'libraryCategories';

export class FirestoreLibraryCategoryRepository implements ILibraryCategoryRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<LibraryCategory>());
  }

  async findById(id: string): Promise<LibraryCategory | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByTenant(tenantId: string): Promise<LibraryCategory[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('ordem', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(category: LibraryCategory): Promise<void> {
    await this.collection.doc(category.id).set(category);
  }

  async update(category: LibraryCategory): Promise<void> {
    await this.collection.doc(category.id).set(category);
  }
}
