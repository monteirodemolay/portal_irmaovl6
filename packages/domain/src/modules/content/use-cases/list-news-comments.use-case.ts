import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { NewsComment } from '../entities/news-comment.entity';
import type { INewsCommentRepository } from '../repositories/news-comment.repository';

export interface ListNewsCommentsDeps {
  newsCommentRepository: INewsCommentRepository;
}

/** Comentários já aprovados de uma notícia — requer `news:read`. */
export class ListApprovedNewsCommentsUseCase {
  constructor(private readonly deps: ListNewsCommentsDeps) {}

  async execute(ctx: AuthContext, newsId: string): Promise<NewsComment[]> {
    requirePermission(ctx, 'news:read');
    return this.deps.newsCommentRepository.listApprovedByNews(newsId);
  }
}

/** Fila de moderação (todo o tenant) — requer `news:manage`. */
export class ListPendingNewsCommentsUseCase {
  constructor(private readonly deps: ListNewsCommentsDeps) {}

  async execute(ctx: AuthContext): Promise<NewsComment[]> {
    requirePermission(ctx, 'news:manage');
    return this.deps.newsCommentRepository.listPendingByTenant(ctx.tenantId);
  }
}
