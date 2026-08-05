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
  nomeMaconico: null,
  fotoUrl: null,
  email: 'fulano@vl6.org.br',
  telefone: null,
  whatsapp: null,
  endereco: null,
  dataNascimento: null,
  dataIniciacao: null,
  dataElevacao: null,
  dataExaltacao: null,
  cim: null,
  matricula: '123',
  grau: 'mestre',
  situacao: 'regular',
  lojaId: 't1',
  potencia: 'GLEG',
  profissao: null,
  empresa: null,
  estadoCivil: null,
  biografia: null,
  redesSociais: { instagram: null, facebook: null, linkedin: null },
  observacoes: null,
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
  it('cadastra um novo Irmão com matrícula única', async () => {
    const { useCase, memberRepository } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('id-1');
    expect(result.value.matricula).toBe('123');
    expect(result.value.tenantId).toBe('t1');
    expect(result.value.status).toBe('active');

    const stored = await memberRepository.findById('id-1');
    expect(stored).not.toBeNull();
  });

  it('lança ForbiddenError quando falta a permissão member:create', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute(readOnlyCtx, input)).rejects.toThrow(ForbiddenError);
  });

  it('rejeita matrícula já em uso no tenant', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await useCase.execute(ctx, input);

    const result = await useCase.execute(ctx, { ...input, email: 'outro@vl6.org.br' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');

    const all = await memberRepository.findById('id-2');
    expect(all).toBeNull();
  });

  it('rejeita CIM já em uso no tenant', async () => {
    const { useCase } = buildUseCase();
    await useCase.execute(ctx, { ...input, cim: 'CIM-1' });

    const result = await useCase.execute(ctx, {
      ...input,
      matricula: '456',
      cim: 'CIM-1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });
});
