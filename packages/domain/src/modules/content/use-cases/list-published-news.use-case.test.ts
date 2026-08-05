import { describe, expect, it } from 'vitest';
import { InMemoryNewsRepository } from '../../../test/fakes';
import type { News } from '../entities/news.entity';
import { ListPublishedNewsUseCase } from './list-published-news.use-case';

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
    publicado: true,
    dataPublicacao: new Date('2026-01-01'),
    contagemVisualizacoes: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ListPublishedNewsUseCase', () => {
  it('lista apenas notícias publicadas do tenant, sem exigir AuthContext', async () => {
    const newsRepository = new InMemoryNewsRepository();
    await newsRepository.create(buildNews({ id: 'publicada' }));
    const useCase = new ListPublishedNewsUseCase({ newsRepository });

    const result = await useCase.execute('t1', { limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('publicada');
  });

  it('exclui notícias em rascunho da listagem pública', async () => {
    const newsRepository = new InMemoryNewsRepository();
    await newsRepository.create(buildNews({ id: 'publicada' }));
    await newsRepository.create(
      buildNews({ id: 'rascunho', publicado: false, dataPublicacao: null, status: 'draft' }),
    );
    const useCase = new ListPublishedNewsUseCase({ newsRepository });

    const result = await useCase.execute('t1', { limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items.some((n) => n.id === 'rascunho')).toBe(false);
  });
});
