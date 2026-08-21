import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryNewsRepository } from '../../../test/fakes';
import type { News } from '../entities/news.entity';
import { DeleteNewsUseCase } from './delete-news.use-case';

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

describe('DeleteNewsUseCase', () => {
  it('marca deletedAt sem apagar o documento', async () => {
    const newsRepository = new InMemoryNewsRepository();
    await newsRepository.create(buildNews());
    const useCase = new DeleteNewsUseCase({
      newsRepository,
      clock: new FixedClock(new Date('2026-03-01')),
    });

    const result = await useCase.execute(ctx, 'noticia-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.deletedAt).toEqual(new Date('2026-03-01'));
    expect(await newsRepository.findById('noticia-1')).not.toBeNull();
  });

  it('retorna NotFoundError quando a notícia não existe no tenant', async () => {
    const newsRepository = new InMemoryNewsRepository();
    const useCase = new DeleteNewsUseCase({ newsRepository, clock: new FixedClock() });

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
