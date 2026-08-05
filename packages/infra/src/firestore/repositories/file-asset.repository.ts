import { FieldValue, type Firestore, type Query } from 'firebase-admin/firestore';
import type { FileAsset, IFileAssetRepository, PageRequest, PageResult } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'files';
const DATE_FIELDS = ['dataPublicacao'] as const;

export class FirestoreFileAssetRepository implements IFileAssetRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<FileAsset>(DATE_FIELDS));
  }

  async findById(id: string): Promise<FileAsset | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listPublishedByCategory(
    tenantId: string,
    categoriaId: string,
    page: PageRequest,
  ): Promise<PageResult<FileAsset>> {
    const query = this.collection
      .where('tenantId', '==', tenantId)
      .where('categoriaId', '==', categoriaId)
      .where('publicado', '==', true)
      .where('deletedAt', '==', null)
      .orderBy('ordem', 'asc');
    return this.paginate(query, page);
  }

  async listAll(tenantId: string, page: PageRequest): Promise<PageResult<FileAsset>> {
    const query = this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc');
    return this.paginate(query, page);
  }

  private async paginate(
    query: Query<FileAsset>,
    page: PageRequest,
  ): Promise<PageResult<FileAsset>> {
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

  async create(file: FileAsset): Promise<void> {
    await this.collection.doc(file.id).set(file);
  }

  async update(file: FileAsset): Promise<void> {
    await this.collection.doc(file.id).set(file);
  }

  async incrementDownloads(id: string): Promise<void> {
    await this.collection.doc(id).update({ contagemDownloads: FieldValue.increment(1) });
  }

  async incrementViews(id: string): Promise<void> {
    await this.collection.doc(id).update({ contagemVisualizacoes: FieldValue.increment(1) });
  }
}
