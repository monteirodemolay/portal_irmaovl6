import type { Firestore, Query } from 'firebase-admin/firestore';
import type { GalleryAlbum, IGalleryAlbumRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'galleryAlbums';
const DATE_FIELDS = ['dataEvento'] as const;

export class FirestoreGalleryAlbumRepository implements IGalleryAlbumRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<GalleryAlbum>(DATE_FIELDS));
  }

  async findById(id: string): Promise<GalleryAlbum | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByTenant(tenantId: string, categoria?: string): Promise<GalleryAlbum[]> {
    let query: Query<GalleryAlbum> = this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null);
    if (categoria) {
      query = query.where('categoria', '==', categoria);
    }
    const snap = await query.orderBy('dataEvento', 'desc').get();
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

  async create(album: GalleryAlbum): Promise<void> {
    await this.collection.doc(album.id).set(album);
  }

  async update(album: GalleryAlbum): Promise<void> {
    await this.collection.doc(album.id).set(album);
  }
}
