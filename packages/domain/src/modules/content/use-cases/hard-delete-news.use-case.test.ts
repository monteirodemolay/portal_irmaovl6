import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryNewsRepository } from '../../../test/fakes';
import type { News } from '../entities/news.entity';
import { HardDeleteNewsUseCase } from './hard-delete-news.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['news:manage'],
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
    publicado: false,
    dataPublicacao: null,
    contagemVisualizacoes: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: new Date('2026-02-01'),
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('HardDeleteNewsUseCase', () => {
  it('remove o documento de vez', async () => {
    const newsRepository = new InMemoryNewsRepository();
    await newsRepository.create(buildNews());
    const useCase = new HardDeleteNewsUseCase({ newsRepository });

    const result = await useCase.execute(ctx, 'noticia-1');

    expect(result.ok).toBe(true);
    expect(await newsRepository.findById('noticia-1')).toBeNull();
  });
});
