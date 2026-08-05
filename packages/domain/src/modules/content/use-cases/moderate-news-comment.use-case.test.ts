import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import type { NewsComment } from '../entities/news-comment.entity';
import type { INewsCommentRepository } from '../repositories/news-comment.repository';
import { ModerateNewsCommentUseCase } from './moderate-news-comment.use-case';

const ctx: AuthContext = {
  uid: 'admin',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['news:manage'],
};
const clock: IClock = { now: () => new Date('2026-02-01T00:00:00Z') };

function buildComment(overrides: Partial<NewsComment> = {}): NewsComment {
  return {
    id: 'comment-1',
    tenantId: 't1',
    newsId: 'news-1',
    autorId: 'u1',
    texto: 'Ótima notícia!',
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

class FakeNewsCommentRepository implements Partial<INewsCommentRepository> {
  constructor(private readonly comment: NewsComment) {}
  updated: NewsComment | null = null;
  async findById() {
    return this.comment;
  }
  async update(comment: NewsComment) {
    this.updated = comment;
  }
}

describe('ModerateNewsCommentUseCase', () => {
  it('aprova marcando moderado=true, sem soft delete', async () => {
    const repo = new FakeNewsCommentRepository(buildComment());
    const useCase = new ModerateNewsCommentUseCase({
      newsCommentRepository: repo as unknown as INewsCommentRepository,
      clock,
    });

    const result = await useCase.execute(ctx, 'comment-1', true);

    expect(result.ok).toBe(true);
    expect(repo.updated?.moderado).toBe(true);
    expect(repo.updated?.deletedAt).toBeNull();
  });

  it('reprova via soft delete, mantendo moderado=false', async () => {
    const repo = new FakeNewsCommentRepository(buildComment());
    const useCase = new ModerateNewsCommentUseCase({
      newsCommentRepository: repo as unknown as INewsCommentRepository,
      clock,
    });

    const result = await useCase.execute(ctx, 'comment-1', false);

    expect(result.ok).toBe(true);
    expect(repo.updated?.moderado).toBe(false);
    expect(repo.updated?.deletedAt).not.toBeNull();
    expect(repo.updated?.ativo).toBe(false);
  });
});
