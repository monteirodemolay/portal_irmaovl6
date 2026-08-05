import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { News } from '../entities/news.entity';
import type { INewsRepository } from '../repositories/news.repository';

export interface ListAllNewsDeps {
  newsRepository: INewsRepository;
}

/** Listagem administrativa (inclui rascunhos) — requer `news:read`. */
export class ListAllNewsUseCase {
  constructor(private readonly deps: ListAllNewsDeps) {}

  async execute(ctx: AuthContext, page: PageRequest): Promise<PageResult<News>> {
    requirePermission(ctx, 'news:read');
    return this.deps.newsRepository.listAll(ctx.tenantId, page);
  }
}
