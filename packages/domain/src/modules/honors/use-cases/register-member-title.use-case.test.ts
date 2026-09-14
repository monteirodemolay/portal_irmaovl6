import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryMemberTitleRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import {
  RegisterMemberTitleUseCase,
  type RegisterMemberTitleInput,
} from './register-member-title.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['honor:manage'],
};

const input: RegisterMemberTitleInput = {
  memberId: 'member-1',
  titulo: 'benfeitor',
  tituloOutro: null,
  dataConcessao: new Date('2025-01-01'),
  fundamento: 'Ata da Sessão de 01/01/2025',
};

function buildUseCase() {
  const memberTitleRepository = new InMemoryMemberTitleRepository();
  const useCase = new RegisterMemberTitleUseCase({
    memberTitleRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, memberTitleRepository };
}

describe('RegisterMemberTitleUseCase', () => {
  it('cadastra o título vinculado ao Irmão e ao tenant do contexto', async () => {
    const { useCase, memberTitleRepository } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.memberId).toBe('member-1');
    expect(result.value.titulo).toBe('benfeitor');
    expect(result.value.tenantId).toBe('t1');
    expect(result.value.ativo).toBe(true);

    const stored = await memberTitleRepository.findById(result.value.id);
    expect(stored).not.toBeNull();
  });

  it('só grava tituloOutro quando titulo é "outro"', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, {
      ...input,
      titulo: 'mestre_instalado',
      tituloOutro: 'Ignorado',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tituloOutro).toBeNull();
  });

  it('lança ForbiddenError quando falta a permissão honor:manage', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, input)).rejects.toThrow(ForbiddenError);
  });
});
