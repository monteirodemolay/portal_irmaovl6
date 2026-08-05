import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryNewsCommentRepository } from '../../../test/fakes';
import type { NewsComment } from '../entities/news-comment.entity';
import {
  ListApprovedNewsCommentsUseCase,
  ListPendingNewsCommentsUseCase,
} from './list-news-comments.use-case';

const ctxLeitor: AuthContext = {
  uid: 'membro-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['news:read'],
};

const ctxModerador: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['news:manage'],
};

const ctxSemPermissao: AuthContext = {
  uid: 'membro-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: [],
};

function buildComment(overrides: Partial<NewsComment> = {}): NewsComment {
  return {
    id: 'comment-1',
    tenantId: 't1',
    newsId: 'news-1',
    autorId: 'u1',
    texto: 'Comentário',
    moderado: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'u1',
    updatedBy: 'u1',
    deletedAt: null,
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

describe('ListApprovedNewsCommentsUseCase', () => {
  it('retorna apenas comentários já moderados/aprovados da notícia', async () => {
    const newsCommentRepository = new InMemoryNewsCommentRepository();
    await newsCommentRepository.create(
      buildComment({ id: 'aprovado', moderado: true, status: 'active' }),
    );
    await newsCommentRepository.create(buildComment({ id: 'pendente', moderado: false }));
    const useCase = new ListApprovedNewsCommentsUseCase({ newsCommentRepository });

    const result = await useCase.execute(ctxLeitor, 'news-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('aprovado');
  });

  it('lança ForbiddenError sem a permissão news:read', async () => {
    const newsCommentRepository = new InMemoryNewsCommentRepository();
    const useCase = new ListApprovedNewsCommentsUseCase({ newsCommentRepository });

    await expect(useCase.execute(ctxSemPermissao, 'news-1')).rejects.toThrow(ForbiddenError);
  });
});

describe('ListPendingNewsCommentsUseCase', () => {
  it('retorna a fila de moderação (comentários pendentes) do tenant', async () => {
    const newsCommentRepository = new InMemoryNewsCommentRepository();
    await newsCommentRepository.create(buildComment({ id: 'pendente-1', moderado: false }));
    await newsCommentRepository.create(
      buildComment({ id: 'aprovado', moderado: true, status: 'active' }),
    );
    const useCase = new ListPendingNewsCommentsUseCase({ newsCommentRepository });

    const result = await useCase.execute(ctxModerador);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('pendente-1');
  });

  it('lança ForbiddenError sem a permissão news:manage', async () => {
    const newsCommentRepository = new InMemoryNewsCommentRepository();
    const useCase = new ListPendingNewsCommentsUseCase({ newsCommentRepository });

    await expect(useCase.execute(ctxLeitor)).rejects.toThrow(ForbiddenError);
  });
});
