import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { ILibraryItemRepository, LibraryItem } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'libraryItems';

export class FirestoreLibraryItemRepository implements ILibraryItemRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(createEntityConverter<LibraryItem>());
  }

  async findById(id: string): Promise<LibraryItem | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByCategory(tenantId: string, categoriaId: string): Promise<LibraryItem[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('categoriaId', '==', categoriaId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listByTenant(tenantId: string): Promise<LibraryItem[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async countByTenant(tenantId: string): Promise<number> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .count()
      .get();
    return snap.data().count;
  }

  async create(item: LibraryItem): Promise<void> {
    await this.collection.doc(item.id).set(item);
  }

  async update(item: LibraryItem): Promise<void> {
    await this.collection.doc(item.id).set(item);
  }

  async incrementDownloads(id: string): Promise<void> {
    await this.collection.doc(id).update({ contagemDownloads: FieldValue.increment(1) });
  }

  async incrementViews(id: string): Promise<void> {
    await this.collection.doc(id).update({ contagemVisualizacoes: FieldValue.increment(1) });
  }
}
