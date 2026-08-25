import { describe, expect, it } from 'vitest';
import type { MemberFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryMemberRepository, SequentialIdGenerator } from '../../../test/fakes';
import { RegisterMemberUseCase } from './register-member.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:create'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['member:read'],
};

const input: MemberFormValues = {
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
  situacao: 'regular',
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
};

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new RegisterMemberUseCase({
    memberRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, memberRepository };
}

describe('RegisterMemberUseCase', () => {
  it('cadastra um novo Irmão', async () => {
    const { useCase, memberRepository } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('id-1');
    expect(result.value.cim).toBe('123');
    expect(result.value.tenantId).toBe('t1');
    expect(result.value.status).toBe('active');

    const stored = await memberRepository.findById('id-1');
    expect(stored).not.toBeNull();
  });

  it('lança ForbiddenError quando falta a permissão member:create', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute(readOnlyCtx, input)).rejects.toThrow(ForbiddenError);
  });

  it('cadastra sem CIM e permite outro Irmão também sem CIM', async () => {
    const { useCase, memberRepository } = buildUseCase();

    const first = await useCase.execute(ctx, { ...input, cim: null });
    expect(first.ok).toBe(true);

    const second = await useCase.execute(ctx, {
      ...input,
      email: 'outro@vl6.org.br',
      cim: null,
    });

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.cim).toBeNull();

    const stored = await memberRepository.findById('id-2');
    expect(stored).not.toBeNull();
  });

  it('rejeita CIM já em uso no tenant', async () => {
    const { useCase } = buildUseCase();
    await useCase.execute(ctx, { ...input, cim: 'CIM-1' });

    const result = await useCase.execute(ctx, {
      ...input,
      email: 'outro@vl6.org.br',
      cim: 'CIM-1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });
});
