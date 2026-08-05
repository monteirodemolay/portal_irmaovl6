import type { Firestore } from 'firebase-admin/firestore';
import type { ILibraryFavoriteRepository, LibraryFavorite } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'libraryFavorites';

export class FirestoreLibraryFavoriteRepository implements ILibraryFavoriteRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<LibraryFavorite>());
  }

  async findByUserAndItem(userId: string, libraryItemId: string): Promise<LibraryFavorite | null> {
    const snap = await this.collection
      .where('userId', '==', userId)
      .where('libraryItemId', '==', libraryItemId)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listByUser(tenantId: string, userId: string): Promise<LibraryFavorite[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(favorite: LibraryFavorite): Promise<void> {
    await this.collection.doc(favorite.id).set(favorite);
  }

  /** Exclusão física, deliberada — ver justificativa em `ILibraryFavoriteRepository.delete`. */
  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
