import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryNewsCommentRepository,
  InMemoryNewsRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { News } from '../entities/news.entity';
import { CreateNewsCommentUseCase } from './create-news-comment.use-case';

const ctx: AuthContext = {
  uid: 'membro-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['news:read'],
};

const ctxSemPermissao: AuthContext = {
  uid: 'membro-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: [],
};

function buildNews(overrides: Partial<News> = {}): News {
  return {
    id: 'news-1',
    tenantId: 't1',
    titulo: 'Notícia de teste',
    subtitulo: null,
    slug: 'noticia-de-teste',
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

function buildUseCase() {
  const newsRepository = new InMemoryNewsRepository();
  const newsCommentRepository = new InMemoryNewsCommentRepository();
  const useCase = new CreateNewsCommentUseCase({
    newsRepository,
    newsCommentRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, newsRepository, newsCommentRepository };
}

describe('CreateNewsCommentUseCase', () => {
  it('cria comentário não moderado vinculado ao autor da sessão', async () => {
    const { useCase, newsRepository, newsCommentRepository } = buildUseCase();
    await newsRepository.create(buildNews());

    const result = await useCase.execute(ctx, 'news-1', 'Muito boa a notícia!');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.moderado).toBe(false);
    expect(result.value.autorId).toBe('membro-1');
    expect(result.value.texto).toBe('Muito boa a notícia!');
    expect(result.value.status).toBe('draft');

    const persisted = await newsCommentRepository.findById(result.value.id);
    expect(persisted).not.toBeNull();
  });

  it('lança ForbiddenError sem a permissão news:read', async () => {
    const { useCase, newsRepository } = buildUseCase();
    await newsRepository.create(buildNews());

    await expect(useCase.execute(ctxSemPermissao, 'news-1', 'Comentário')).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('retorna NotFoundError quando a notícia não existe no tenant', async () => {
    const { useCase, newsRepository } = buildUseCase();
    await newsRepository.create(buildNews({ id: 'news-outro-tenant', tenantId: 't2' }));

    const result = await useCase.execute(ctx, 'news-outro-tenant', 'Comentário');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
