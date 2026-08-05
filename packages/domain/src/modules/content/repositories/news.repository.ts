import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { News } from '../entities/news.entity';

export interface INewsRepository {
  findById(id: string): Promise<News | null>;
  findPublishedBySlug(tenantId: string, slug: string): Promise<News | null>;
  existsBySlug(tenantId: string, slug: string): Promise<boolean>;
  listPublished(tenantId: string, page: PageRequest): Promise<PageResult<News>>;
  listAll(tenantId: string, page: PageRequest): Promise<PageResult<News>>;
  create(news: News): Promise<void>;
  update(news: News): Promise<void>;
}
