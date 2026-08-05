import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryLibraryCategoryRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateLibraryCategoryUseCase } from './create-library-category.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['libraryItem:manage'],
};

function buildUseCase() {
  const libraryCategoryRepository = new InMemoryLibraryCategoryRepository();
  const useCase = new CreateLibraryCategoryUseCase({
    libraryCategoryRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, libraryCategoryRepository };
}

describe('CreateLibraryCategoryUseCase', () => {
  it('exige a permissão libraryItem:manage', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(
      useCase.execute(semPermissao, { nome: 'Rituais', categoriaPaiId: null, ordem: 0 }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('cria uma categoria raiz', async () => {
    const { useCase, libraryCategoryRepository } = buildUseCase();

    const result = await useCase.execute(ctx, { nome: 'Rituais', categoriaPaiId: null, ordem: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nome).toBe('Rituais');
    expect(result.value.categoriaPaiId).toBeNull();
    expect(result.value.tenantId).toBe('t1');
    expect(await libraryCategoryRepository.findById(result.value.id)).not.toBeNull();
  });

  it('cria uma subcategoria vinculada à categoria pai', async () => {
    const { useCase, libraryCategoryRepository } = buildUseCase();
    const pai = await useCase.execute(ctx, { nome: 'Rituais', categoriaPaiId: null, ordem: 0 });
    if (!pai.ok) throw new Error('setup falhou');

    const result = await useCase.execute(ctx, {
      nome: 'Grau de Aprendiz',
      categoriaPaiId: pai.value.id,
      ordem: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.categoriaPaiId).toBe(pai.value.id);
    const todas = await libraryCategoryRepository.listByTenant('t1');
    expect(todas).toHaveLength(2);
  });
});
