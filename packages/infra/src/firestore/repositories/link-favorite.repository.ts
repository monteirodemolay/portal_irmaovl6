import type { Firestore } from 'firebase-admin/firestore';
import type { ILinkFavoriteRepository, LinkFavorite } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'linkFavorites';

export class FirestoreLinkFavoriteRepository implements ILinkFavoriteRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<LinkFavorite>());
  }

  async findByUserAndLink(userId: string, linkId: string): Promise<LinkFavorite | null> {
    const snap = await this.collection
      .where('userId', '==', userId)
      .where('linkId', '==', linkId)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listByUser(tenantId: string, userId: string): Promise<LinkFavorite[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(favorite: LinkFavorite): Promise<void> {
    await this.collection.doc(favorite.id).set(favorite);
  }

  /** Exclusão física, deliberada — mesma justificativa de `FirestoreLibraryFavoriteRepository.delete`. */
  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }
}
