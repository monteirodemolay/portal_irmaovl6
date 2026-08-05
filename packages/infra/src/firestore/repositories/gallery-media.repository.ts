import type { Firestore } from 'firebase-admin/firestore';
import type { GalleryMedia, IGalleryMediaRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'galleryMedia';

export class FirestoreGalleryMediaRepository implements IGalleryMediaRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<GalleryMedia>());
  }

  async findById(id: string): Promise<GalleryMedia | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByAlbum(albumId: string): Promise<GalleryMedia[]> {
    const snap = await this.collection
      .where('albumId', '==', albumId)
      .where('deletedAt', '==', null)
      .orderBy('ordem', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(media: GalleryMedia): Promise<void> {
    await this.collection.doc(media.id).set(media);
  }

  async update(media: GalleryMedia): Promise<void> {
    await this.collection.doc(media.id).set(media);
  }
}
