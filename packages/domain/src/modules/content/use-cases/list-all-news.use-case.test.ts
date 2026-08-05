import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryNewsRepository } from '../../../test/fakes';
import type { News } from '../entities/news.entity';
import { ListAllNewsUseCase } from './list-all-news.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['news:read'],
};

const ctxSemPermissao: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: [],
};

function buildNews(overrides: Partial<News> = {}): News {
  return {
    id: 'news-1',
    tenantId: 't1',
    titulo: 'Notícia',
    subtitulo: null,
    slug: 'noticia',
    imagemCapaUrl: null,
    conteudoHtml: '<p>Conteúdo</p>',
    autorId: 'admin-1',
    categoria: 'geral',
    publicado: false,
    dataPublicacao: null,
    contagemVisualizacoes: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

describe('ListAllNewsUseCase', () => {
  it('lista notícias do tenant, incluindo rascunhos', async () => {
    const newsRepository = new InMemoryNewsRepository();
    await newsRepository.create(buildNews({ id: 'rascunho', publicado: false }));
    await newsRepository.create(buildNews({ id: 'publicada', publicado: true, status: 'active' }));
    const useCase = new ListAllNewsUseCase({ newsRepository });

    const result = await useCase.execute(ctx, { limit: 20 });

    expect(result.items).toHaveLength(2);
  });

  it('lança ForbiddenError sem a permissão news:read', async () => {
    const newsRepository = new InMemoryNewsRepository();
    const useCase = new ListAllNewsUseCase({ newsRepository });

    await expect(useCase.execute(ctxSemPermissao, { limit: 20 })).rejects.toThrow(ForbiddenError);
  });

  it('não retorna notícias de outro tenant', async () => {
    const newsRepository = new InMemoryNewsRepository();
    await newsRepository.create(buildNews({ id: 'meu-tenant', tenantId: 't1' }));
    await newsRepository.create(buildNews({ id: 'outro-tenant', tenantId: 't2' }));
    const useCase = new ListAllNewsUseCase({ newsRepository });

    const result = await useCase.execute(ctx, { limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('meu-tenant');
  });
});
