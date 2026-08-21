import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { News } from '../entities/news.entity';
import type { INewsRepository } from '../repositories/news.repository';

export interface DeleteNewsDeps {
  newsRepository: INewsRepository;
  clock: IClock;
}

/** Exclusão lógica — seta `deletedAt`, nunca remove o documento (docs/architecture/03 §3.1). */
export class DeleteNewsUseCase {
  constructor(private readonly deps: DeleteNewsDeps) {}

  async execute(ctx: AuthContext, newsId: string): Promise<Result<News>> {
    requirePermission(ctx, 'news:delete');

    const current = await this.deps.newsRepository.findById(newsId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('News', newsId));
    }

    const now = this.deps.clock.now();
    const updated: News = {
      ...current,
      deletedAt: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.newsRepository.update(updated);

    return ok(updated);
  }
}
