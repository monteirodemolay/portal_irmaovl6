import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { INewsRepository } from '../repositories/news.repository';

export interface HardDeleteNewsDeps {
  newsRepository: INewsRepository;
}

/** Exclusão física, irreversível — usada pra apagar registros de vez (ex.: cadastro por engano). */
export class HardDeleteNewsUseCase {
  constructor(private readonly deps: HardDeleteNewsDeps) {}

  async execute(ctx: AuthContext, newsId: string): Promise<Result<void>> {
    requirePermission(ctx, 'news:delete');

    const current = await this.deps.newsRepository.findById(newsId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('News', newsId));
    }

    await this.deps.newsRepository.hardDelete(newsId);
    return ok(undefined);
  }
}
