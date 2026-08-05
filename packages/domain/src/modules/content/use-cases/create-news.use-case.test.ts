import { describe, expect, it } from 'vitest';
import type { NewsFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ConflictError, ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryNewsRepository, SequentialIdGenerator } from '../../../test/fakes';
import { CreateNewsUseCase } from './create-news.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['news:create'],
};

const ctxSemPermissao: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: [],
};

const baseInput: NewsFormValues = {
  titulo: 'Nova notícia',
  subtitulo: null,
  slug: 'nova-noticia',
  imagemCapaUrl: null,
  conteudoHtml: '<p>Conteúdo</p>',
  categoria: 'geral',
};

function buildUseCase() {
  const newsRepository = new InMemoryNewsRepository();
  const useCase = new CreateNewsUseCase({
    newsRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, newsRepository };
}

describe('CreateNewsUseCase', () => {
  it('cria a notícia em rascunho, sem data de publicação', async () => {
    const { useCase, newsRepository } = buildUseCase();

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicado).toBe(false);
    expect(result.value.dataPublicacao).toBeNull();
    expect(result.value.contagemVisualizacoes).toBe(0);
    expect(result.value.autorId).toBe('admin-1');
    expect(result.value.status).toBe('draft');

    const persisted = await newsRepository.findById(result.value.id);
    expect(persisted).not.toBeNull();
  });

  it('lança ForbiddenError sem a permissão news:create', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute(ctxSemPermissao, baseInput)).rejects.toThrow(ForbiddenError);
  });

  it('retorna ConflictError quando o slug já está em uso no tenant', async () => {
    const { useCase } = buildUseCase();
    await useCase.execute(ctx, baseInput);

    const result = await useCase.execute(ctx, { ...baseInput, titulo: 'Outra notícia' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ConflictError);
  });
});
