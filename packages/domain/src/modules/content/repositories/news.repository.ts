import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { News } from '../entities/news.entity';

export interface INewsRepository {
  findById(id: string): Promise<News | null>;
  findPublishedBySlug(tenantId: string, slug: string): Promise<News | null>;
  existsBySlug(tenantId: string, slug: string): Promise<boolean>;
  listPublished(tenantId: string, page: PageRequest): Promise<PageResult<News>>;
  listAll(tenantId: string, page: PageRequest): Promise<PageResult<News>>;
  /** Aba "Concluídos" do admin — sem critério natural de conclusão, só excluídas. */
  listConcluded(tenantId: string, page: PageRequest): Promise<PageResult<News>>;
  create(news: News): Promise<void>;
  update(news: News): Promise<void>;
  /** Exclusão física — nunca chamado sem o item já ter passado por soft delete. */
  hardDelete(id: string): Promise<void>;
}
