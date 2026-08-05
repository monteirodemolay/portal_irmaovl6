import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryNewsRepository } from '../../../test/fakes';
import type { News } from '../entities/news.entity';
import { PublishNewsUseCase } from './publish-news.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['news:publish'],
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

function buildUseCase() {
  const newsRepository = new InMemoryNewsRepository();
  const useCase = new PublishNewsUseCase({
    newsRepository,
    clock: new FixedClock(new Date('2026-03-01T00:00:00Z')),
  });
  return { useCase, newsRepository };
}

describe('PublishNewsUseCase', () => {
  it('publica a notícia, define dataPublicacao e status active', async () => {
    const { useCase, newsRepository } = buildUseCase();
    await newsRepository.create(buildNews());

    const result = await useCase.execute(ctx, 'news-1', true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicado).toBe(true);
    expect(result.value.dataPublicacao).toEqual(new Date('2026-03-01T00:00:00Z'));
    expect(result.value.status).toBe('active');
  });

  it('lança ForbiddenError sem a permissão news:publish', async () => {
    const { useCase, newsRepository } = buildUseCase();
    await newsRepository.create(buildNews());

    await expect(useCase.execute(ctxSemPermissao, 'news-1', true)).rejects.toThrow(ForbiddenError);
  });

  it('retorna NotFoundError quando a notícia não existe no tenant', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente', true);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('ao republicar, não sobrescreve a dataPublicacao já existente', async () => {
    const { useCase, newsRepository } = buildUseCase();
    await newsRepository.create(
      buildNews({
        publicado: false,
        dataPublicacao: new Date('2026-01-10T00:00:00Z'),
        status: 'draft',
      }),
    );

    const result = await useCase.execute(ctx, 'news-1', true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dataPublicacao).toEqual(new Date('2026-01-10T00:00:00Z'));
  });
});
