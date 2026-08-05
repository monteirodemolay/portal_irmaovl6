import type { NewsComment } from '../entities/news-comment.entity';

export interface INewsCommentRepository {
  findById(id: string): Promise<NewsComment | null>;
  listApprovedByNews(newsId: string): Promise<NewsComment[]>;
  listPendingByTenant(tenantId: string): Promise<NewsComment[]>;
  create(comment: NewsComment): Promise<void>;
  update(comment: NewsComment): Promise<void>;
}
