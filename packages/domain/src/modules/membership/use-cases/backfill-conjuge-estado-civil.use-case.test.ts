import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryMemberRepository } from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { BackfillConjugeEstadoCivilUseCase } from './backfill-conjuge-estado-civil.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:manage'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'm1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'Fulano de Tal',
    fotoUrl: null,
    email: null,
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: new Date('2003-11-23'),
    dataElevacao: null,
    dataExaltacao: null,
    cim: null,
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'ativo',
    dataFalecimento: null,
    mensagemHomenagem: null,
    lojaId: 't1',
    potencia: 'GLEG',
    profissao: null,
    empresa: null,
    estadoCivil: null,
    conjugeNome: null,
    conjugeDataNascimento: null,
    conjugeAniversarioDia: null,
    conjugeAniversarioMes: null,
    filhos: [],
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: false,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  } as Member;
}

function buildDeps() {
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new BackfillConjugeEstadoCivilUseCase({
    memberRepository,
    clock: new FixedClock(new Date('2026-09-15')),
  });
  return { useCase, memberRepository };
}

describe('BackfillConjugeEstadoCivilUseCase', () => {
  it('marca "casado" quem tem conjugeNome mas estadoCivil em branco', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(buildMember({ conjugeNome: 'Maria de Teste' }));

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalSemEstadoCivil).toBe(1);
    expect(result.value.corrigidos).toEqual([{ memberId: 'm1', nomeCompleto: 'Fulano de Tal' }]);

    const stored = await memberRepository.findById('m1');
    expect(stored?.estadoCivil).toBe('casado');
  });

  it('não mexe em quem já tem estadoCivil definido, mesmo com cônjuge', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(
      buildMember({ conjugeNome: 'Maria de Teste', estadoCivil: 'divorciado' }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalSemEstadoCivil).toBe(0);
    const stored = await memberRepository.findById('m1');
    expect(stored?.estadoCivil).toBe('divorciado');
  });

  it('não mexe em quem não tem cônjuge cadastrada', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(buildMember({ conjugeNome: null }));

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalSemEstadoCivil).toBe(0);
    const stored = await memberRepository.findById('m1');
    expect(stored?.estadoCivil).toBeNull();
  });

  it('lança ForbiddenError sem a permissão member:manage', async () => {
    const { useCase } = buildDeps();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });
});
