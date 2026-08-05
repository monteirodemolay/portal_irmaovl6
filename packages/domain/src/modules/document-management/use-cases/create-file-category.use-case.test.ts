import { describe, expect, it } from 'vitest';
import type { FileCategoryFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryFileCategoryRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateFileCategoryUseCase } from './create-file-category.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['file:manage'],
};

const input: FileCategoryFormValues = {
  nome: 'Atas',
  acervo: null,
  ordem: 0,
};

function buildUseCase() {
  const fileCategoryRepository = new InMemoryFileCategoryRepository();
  const useCase = new CreateFileCategoryUseCase({
    fileCategoryRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, fileCategoryRepository };
}

describe('CreateFileCategoryUseCase', () => {
  it('cria a categoria ativa com os dados do tenant do contexto', async () => {
    const { useCase, fileCategoryRepository } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nome).toBe('Atas');
    expect(result.value.tenantId).toBe('t1');
    expect(result.value.status).toBe('active');
    expect(result.value.ativo).toBe(true);

    const stored = await fileCategoryRepository.findById(result.value.id);
    expect(stored).not.toBeNull();
  });

  it('lança ForbiddenError quando falta a permissão file:manage', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, input)).rejects.toThrow(ForbiddenError);
  });
});
