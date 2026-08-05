import type { NewsFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, ok, err, type Result } from '../../../shared/result';
import type { News } from '../entities/news.entity';
import type { INewsRepository } from '../repositories/news.repository';

export interface CreateNewsDeps {
  newsRepository: INewsRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/** Cria uma notícia em rascunho (`publicado: false`) — publicação é uma ação separada. */
export class CreateNewsUseCase {
  constructor(private readonly deps: CreateNewsDeps) {}

  async execute(ctx: AuthContext, input: NewsFormValues): Promise<Result<News>> {
    requirePermission(ctx, 'news:create');

    const slugTaken = await this.deps.newsRepository.existsBySlug(ctx.tenantId, input.slug);
    if (slugTaken) {
      return err(new ConflictError(`Já existe uma notícia com o slug "${input.slug}".`));
    }

    const now = this.deps.clock.now();
    const news: News = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      autorId: ctx.uid,
      publicado: false,
      dataPublicacao: null,
      contagemVisualizacoes: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.newsRepository.create(news);

    return ok(news);
  }
}
