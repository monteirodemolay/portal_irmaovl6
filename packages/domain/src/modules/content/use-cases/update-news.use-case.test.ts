import { describe, expect, it } from 'vitest';
import type { NewsFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryNewsRepository } from '../../../test/fakes';
import type { News } from '../entities/news.entity';
import { UpdateNewsUseCase } from './update-news.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['news:update'],
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
    titulo: 'Notícia original',
    subtitulo: null,
    slug: 'noticia-original',
    imagemCapaUrl: null,
    conteudoHtml: '<p>Conteúdo original</p>',
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

const inputAtualizado: NewsFormValues = {
  titulo: 'Notícia atualizada',
  subtitulo: 'Novo subtítulo',
  slug: 'noticia-original',
  imagemCapaUrl: null,
  conteudoHtml: '<p>Conteúdo atualizado</p>',
  categoria: 'eventos',
};

function buildUseCase() {
  const newsRepository = new InMemoryNewsRepository();
  const useCase = new UpdateNewsUseCase({
    newsRepository,
    clock: new FixedClock(new Date('2026-04-01T00:00:00Z')),
  });
  return { useCase, newsRepository };
}

describe('UpdateNewsUseCase', () => {
  it('atualiza os campos da notícia mantendo o restante do estado', async () => {
    const { useCase, newsRepository } = buildUseCase();
    await newsRepository.create(buildNews());

    const result = await useCase.execute(ctx, 'news-1', inputAtualizado);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.titulo).toBe('Notícia atualizada');
    expect(result.value.conteudoHtml).toBe('<p>Conteúdo atualizado</p>');
    expect(result.value.updatedAt).toEqual(new Date('2026-04-01T00:00:00Z'));
    expect(result.value.updatedBy).toBe('admin-1');
    expect(result.value.publicado).toBe(false);
  });

  it('lança ForbiddenError sem a permissão news:update', async () => {
    const { useCase, newsRepository } = buildUseCase();
    await newsRepository.create(buildNews());

    await expect(useCase.execute(ctxSemPermissao, 'news-1', inputAtualizado)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('retorna NotFoundError quando a notícia não existe no tenant', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente', inputAtualizado);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('retorna ConflictError ao trocar o slug para um já usado por outra notícia', async () => {
    const { useCase, newsRepository } = buildUseCase();
    await newsRepository.create(buildNews());
    await newsRepository.create(buildNews({ id: 'news-2', slug: 'outra-noticia' }));

    const result = await useCase.execute(ctx, 'news-1', {
      ...inputAtualizado,
      slug: 'outra-noticia',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ConflictError);
  });

  it('não verifica conflito de slug quando o slug permanece o mesmo', async () => {
    const { useCase, newsRepository } = buildUseCase();
    await newsRepository.create(buildNews());

    const result = await useCase.execute(ctx, 'news-1', inputAtualizado);

    expect(result.ok).toBe(true);
  });
});
