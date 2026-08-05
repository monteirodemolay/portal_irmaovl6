import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { News } from '../entities/news.entity';
import type { INewsRepository } from '../repositories/news.repository';

export interface ListPublishedNewsDeps {
  newsRepository: INewsRepository;
}

/** Sem `AuthContext` — notícias publicadas são conteúdo público (site público + área do irmão). */
export class ListPublishedNewsUseCase {
  constructor(private readonly deps: ListPublishedNewsDeps) {}

  async execute(tenantId: string, page: PageRequest): Promise<PageResult<News>> {
    return this.deps.newsRepository.listPublished(tenantId, page);
  }
}
