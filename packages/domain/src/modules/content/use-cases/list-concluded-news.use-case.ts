import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { News } from '../entities/news.entity';
import type { INewsRepository } from '../repositories/news.repository';

export interface ListConcludedNewsDeps {
  newsRepository: INewsRepository;
}

/** Notícias excluídas — fora da aba principal, mantidas só como registro. */
export class ListConcludedNewsUseCase {
  constructor(private readonly deps: ListConcludedNewsDeps) {}

  async execute(ctx: AuthContext, page: PageRequest): Promise<PageResult<News>> {
    requirePermission(ctx, 'news:read');
    return this.deps.newsRepository.listConcluded(ctx.tenantId, page);
  }
}
