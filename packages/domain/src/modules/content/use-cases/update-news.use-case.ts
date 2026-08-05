import type { NewsFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ConflictError, ok, err, type Result } from '../../../shared/result';
import type { News } from '../entities/news.entity';
import type { INewsRepository } from '../repositories/news.repository';

export interface UpdateNewsDeps {
  newsRepository: INewsRepository;
  clock: IClock;
}

export class UpdateNewsUseCase {
  constructor(private readonly deps: UpdateNewsDeps) {}

  async execute(ctx: AuthContext, newsId: string, input: NewsFormValues): Promise<Result<News>> {
    requirePermission(ctx, 'news:update');

    const current = await this.deps.newsRepository.findById(newsId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('News', newsId));
    }

    if (input.slug !== current.slug) {
      const taken = await this.deps.newsRepository.existsBySlug(ctx.tenantId, input.slug);
      if (taken) {
        return err(new ConflictError(`Já existe uma notícia com o slug "${input.slug}".`));
      }
    }

    const updated: News = {
      ...current,
      ...input,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.newsRepository.update(updated);

    return ok(updated);
  }
}
