import type { Firestore } from 'firebase-admin/firestore';
import type { INewsCommentRepository, NewsComment } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'newsComments';

export class FirestoreNewsCommentRepository implements INewsCommentRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION).withConverter(createEntityConverter<NewsComment>());
  }

  async findById(id: string): Promise<NewsComment | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listApprovedByNews(newsId: string): Promise<NewsComment[]> {
    const snap = await this.collection
      .where('newsId', '==', newsId)
      .where('moderado', '==', true)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listPendingByTenant(tenantId: string): Promise<NewsComment[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('moderado', '==', false)
      .where('deletedAt', '==', null)
      .orderBy('createdAt', 'asc')
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(comment: NewsComment): Promise<void> {
    await this.collection.doc(comment.id).set(comment);
  }

  async update(comment: NewsComment): Promise<void> {
    await this.collection.doc(comment.id).set(comment);
  }
}
