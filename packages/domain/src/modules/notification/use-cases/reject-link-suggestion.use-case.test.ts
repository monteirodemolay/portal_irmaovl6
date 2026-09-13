import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, ValidationError } from '../../../shared/result';
import { FixedClock, InMemoryLinkSuggestionRepository } from '../../../test/fakes';
import type { LinkSuggestion } from '../entities/link-suggestion.entity';
import { RejectLinkSuggestionUseCase } from './reject-link-suggestion.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['link:manage'],
};

function buildSuggestion(overrides: Partial<LinkSuggestion> = {}): LinkSuggestion {
  return {
    id: 'sug-1',
    tenantId: 't1',
    memberId: 'u1',
    titulo: 'Site da Loja irmã',
    url: 'https://exemplo.org.br',
    descricao: null,
    revisaoStatus: 'pendente',
    motivoRejeicao: null,
    revisadoPor: null,
    revisadoEm: null,
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
    createdBy: 'u1',
    updatedBy: 'u1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const suggestionRepository = new InMemoryLinkSuggestionRepository();
  const useCase = new RejectLinkSuggestionUseCase({
    suggestionRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, suggestionRepository };
}

describe('RejectLinkSuggestionUseCase', () => {
  it('rejeita a sugestão com o motivo informado', async () => {
    const { useCase, suggestionRepository } = buildUseCase();
    await suggestionRepository.create(buildSuggestion());

    const result = await useCase.execute(ctx, 'sug-1', 'Link fora do escopo institucional.');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.revisaoStatus).toBe('rejeitada');
    expect(result.value.motivoRejeicao).toBe('Link fora do escopo institucional.');
  });

  it('exige motivo de rejeição', async () => {
    const { useCase, suggestionRepository } = buildUseCase();
    await suggestionRepository.create(buildSuggestion());

    const result = await useCase.execute(ctx, 'sug-1', '   ');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('lança ForbiddenError sem a permissão link:manage', async () => {
    const { useCase, suggestionRepository } = buildUseCase();
    await suggestionRepository.create(buildSuggestion());

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'sug-1', 'motivo')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
