import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryMemberRepository } from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { SoftDeleteMemberUseCase } from './soft-delete-member.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:delete'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['member:read'],
};

const baseMember: Member = {
  id: 'member-1',
  tenantId: 't1',
  userId: null,
  nomeCompleto: 'Fulano de Tal',
  fotoUrl: null,
  email: 'fulano@vl6.org.br',
  telefone: null,
  whatsapp: null,
  endereco: null,
  dataNascimento: null,
  dataIniciacao: null,
  dataElevacao: null,
  dataExaltacao: null,
  cim: '123',
  grau: 'mestre',
  cargoAtualId: null,
  situacao: 'ativo',
  lojaId: 't1',
  potencia: 'GLEG',
  profissao: null,
  empresa: null,
  estadoCivil: null,
  conjugeNome: null,
  conjugeDataNascimento: null,
  biografia: null,
  redesSociais: { instagram: null, facebook: null, linkedin: null },
  observacoes: null,
  autorizaDivulgacaoExterna: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new SoftDeleteMemberUseCase({
    memberRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, memberRepository };
}

describe('SoftDeleteMemberUseCase', () => {
  it('marca o Irmão como excluído sem removê-lo do repositório (soft delete)', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(baseMember);

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);

    const stored = await memberRepository.findById('member-1');
    expect(stored).not.toBeNull();
    expect(stored?.deletedAt).toEqual(new Date('2026-06-01T00:00:00Z'));
    expect(stored?.status).toBe('archived');
    expect(stored?.ativo).toBe(false);
  });

  it('lança ForbiddenError quando falta a permissão member:delete', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(baseMember);

    await expect(useCase.execute(readOnlyCtx, 'member-1')).rejects.toThrow(ForbiddenError);
  });

  it('retorna NotFoundError quando o Irmão não existe no tenant', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
