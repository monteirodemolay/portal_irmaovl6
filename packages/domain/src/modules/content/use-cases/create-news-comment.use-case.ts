import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { NewsComment } from '../entities/news-comment.entity';
import type { INewsCommentRepository } from '../repositories/news-comment.repository';
import type { INewsRepository } from '../repositories/news.repository';

export interface CreateNewsCommentDeps {
  newsCommentRepository: INewsCommentRepository;
  newsRepository: INewsRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/** Comentário nasce não moderado (`moderado: false`) — só aparece após aprovação. */
export class CreateNewsCommentUseCase {
  constructor(private readonly deps: CreateNewsCommentDeps) {}

  async execute(ctx: AuthContext, newsId: string, texto: string): Promise<Result<NewsComment>> {
    requirePermission(ctx, 'news:read');

    const news = await this.deps.newsRepository.findById(newsId);
    if (!news || news.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('News', newsId));
    }

    const now = this.deps.clock.now();
    const comment: NewsComment = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      newsId,
      autorId: ctx.uid,
      texto,
      moderado: false,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.newsCommentRepository.create(comment);

    return ok(comment);
  }
}
