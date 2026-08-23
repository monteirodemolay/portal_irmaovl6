import type { Firestore, Query } from 'firebase-admin/firestore';
import type { IMediaAssetRepository, MediaAsset, PageRequest, PageResult } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'mediaAssets';

export class FirestoreMediaAssetRepository implements IMediaAssetRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<MediaAsset>([]));
  }

  async findById(id: string): Promise<MediaAsset | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findByTenant(tenantId: string, page: PageRequest): Promise<PageResult<MediaAsset>> {
    const query = this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc');
    return this.paginate(query, page);
  }

  async findBySha256(tenantId: string, sha256: string): Promise<MediaAsset | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('sha256', '==', sha256)
      .where('deletedAt', '==', null)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  private async paginate(
    query: Query<MediaAsset>,
    page: PageRequest,
  ): Promise<PageResult<MediaAsset>> {
    let paged = query;
    if (page.cursor) {
      const cursorDoc = await this.collection.doc(page.cursor).get();
      if (cursorDoc.exists) paged = paged.startAfter(cursorDoc);
    }
    const snap = await paged.limit(page.limit + 1).get();
    const docs = snap.docs.slice(0, page.limit);
    const hasMore = snap.docs.length > page.limit;
    return {
      items: docs.map((doc) => doc.data()),
      nextCursor: hasMore ? (docs.at(-1)?.id ?? null) : null,
      hasMore,
    };
  }

  async create(mediaAsset: MediaAsset): Promise<void> {
    await this.collection.doc(mediaAsset.id).set(mediaAsset);
  }

  async update(mediaAsset: MediaAsset): Promise<void> {
    await this.collection.doc(mediaAsset.id).set(mediaAsset);
  }

  async softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void> {
    await this.collection.doc(id).update({
      deletedAt,
      updatedAt: deletedAt,
      updatedBy,
      status: 'archived',
      ativo: false,
    });
  }

  async restore(id: string, updatedBy: string): Promise<void> {
    await this.collection.doc(id).update({
      deletedAt: null,
      updatedAt: new Date(),
      updatedBy,
      status: 'active',
      ativo: true,
    });
  }
}
