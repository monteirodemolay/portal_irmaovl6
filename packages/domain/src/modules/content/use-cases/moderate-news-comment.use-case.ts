import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { NewsComment } from '../entities/news-comment.entity';
import type { INewsCommentRepository } from '../repositories/news-comment.repository';

export interface ModerateNewsCommentDeps {
  newsCommentRepository: INewsCommentRepository;
  clock: IClock;
}

/** Aprovar marca `moderado: true`; reprovar é soft delete (nunca some fisicamente). */
export class ModerateNewsCommentUseCase {
  constructor(private readonly deps: ModerateNewsCommentDeps) {}

  async execute(
    ctx: AuthContext,
    commentId: string,
    aprovar: boolean,
  ): Promise<Result<NewsComment>> {
    requirePermission(ctx, 'news:manage');

    const comment = await this.deps.newsCommentRepository.findById(commentId);
    if (!comment || comment.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('NewsComment', commentId));
    }

    const now = this.deps.clock.now();
    const updated: NewsComment = aprovar
      ? { ...comment, moderado: true, status: 'active', updatedAt: now, updatedBy: ctx.uid }
      : {
          ...comment,
          deletedAt: now,
          status: 'archived',
          ativo: false,
          updatedAt: now,
          updatedBy: ctx.uid,
        };
    await this.deps.newsCommentRepository.update(updated);

    return ok(updated);
  }
}
