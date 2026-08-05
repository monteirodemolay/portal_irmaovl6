import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { News } from '../entities/news.entity';
import type { INewsRepository } from '../repositories/news.repository';

export interface PublishNewsDeps {
  newsRepository: INewsRepository;
  clock: IClock;
}

/** Pipeline de publicação: rascunho -> publicado (docs/architecture/06 §6.5). */
export class PublishNewsUseCase {
  constructor(private readonly deps: PublishNewsDeps) {}

  async execute(ctx: AuthContext, newsId: string, publicar: boolean): Promise<Result<News>> {
    requirePermission(ctx, 'news:publish');

    const current = await this.deps.newsRepository.findById(newsId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('News', newsId));
    }

    const now = this.deps.clock.now();
    const updated: News = {
      ...current,
      publicado: publicar,
      dataPublicacao: publicar ? (current.dataPublicacao ?? now) : current.dataPublicacao,
      status: publicar ? 'active' : 'draft',
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.newsRepository.update(updated);

    return ok(updated);
  }
}
