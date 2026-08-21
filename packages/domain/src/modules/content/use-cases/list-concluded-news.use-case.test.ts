import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryNewsRepository } from '../../../test/fakes';
import type { News } from '../entities/news.entity';
import { ListConcludedNewsUseCase } from './list-concluded-news.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['news:read'],
};

function buildNews(overrides: Partial<News> = {}): News {
  return {
    id: 'noticia-1',
    tenantId: 't1',
    titulo: 'Notícia',
    subtitulo: null,
    slug: 'noticia',
    imagemCapaUrl: null,
    conteudoHtml: '<p>Conteúdo</p>',
    autorId: 'admin-1',
    categoria: 'Institucional',
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

describe('ListConcludedNewsUseCase', () => {
  it('inclui só as excluídas', async () => {
    const newsRepository = new InMemoryNewsRepository();
    await newsRepository.create(buildNews({ id: 'excluida', deletedAt: new Date('2026-01-20') }));
    await newsRepository.create(buildNews({ id: 'ativa' }));
    const useCase = new ListConcludedNewsUseCase({ newsRepository });

    const result = await useCase.execute(ctx, { limit: 20 });

    expect(result.items.map((n) => n.id)).toEqual(['excluida']);
  });
});
