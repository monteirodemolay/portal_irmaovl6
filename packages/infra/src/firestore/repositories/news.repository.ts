import type { Firestore, Query } from 'firebase-admin/firestore';
import type { INewsRepository, News, PageRequest, PageResult } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'news';
const DATE_FIELDS = ['dataPublicacao'] as const;

export class FirestoreNewsRepository implements INewsRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<News>(DATE_FIELDS));
  }

  async findById(id: string): Promise<News | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findPublishedBySlug(tenantId: string, slug: string): Promise<News | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('slug', '==', slug)
      .where('publicado', '==', true)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async existsBySlug(tenantId: string, slug: string): Promise<boolean> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('slug', '==', slug)
      .limit(1)
      .get();
    return !snap.empty;
  }

  async listPublished(tenantId: string, page: PageRequest): Promise<PageResult<News>> {
    const query = this.collection
      .where('tenantId', '==', tenantId)
      .where('publicado', '==', true)
      .where('deletedAt', '==', null)
      .orderBy('dataPublicacao', 'desc');
    return this.paginate(query, page);
  }

  async listAll(tenantId: string, page: PageRequest): Promise<PageResult<News>> {
    const query = this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'desc');
    return this.paginate(query, page);
  }

  private async paginate(query: Query<News>, page: PageRequest): Promise<PageResult<News>> {
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

  async create(news: News): Promise<void> {
    await this.collection.doc(news.id).set(news);
  }

  async update(news: News): Promise<void> {
    await this.collection.doc(news.id).set(news);
  }
}
