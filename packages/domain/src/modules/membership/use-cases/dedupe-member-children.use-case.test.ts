import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryMemberRepository } from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { DedupeMemberChildrenUseCase } from './dedupe-member-children.use-case';

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
  const useCase = new DedupeMemberChildrenUseCase({
    memberRepository,
    clock: new FixedClock(new Date('2026-09-15')),
  });
  return { useCase, memberRepository };
}

describe('DedupeMemberChildrenUseCase', () => {
  it('remove filho com nome quase igual (uma letra) e mesma data, mantendo a entrada mais antiga', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(
      buildMember({
        filhos: [
          { id: 'f1', nome: 'Eduardo Garcez de Moares', aniversarioDia: 7, aniversarioMes: 12 },
          { id: 'f2', nome: 'Eduardo Garcez de Moraes', aniversarioDia: 7, aniversarioMes: 12 },
        ],
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([
      { memberId: 'm1', nomeCompleto: 'Fulano de Tal', removidos: ['Eduardo Garcez de Moraes'] },
    ]);

    const stored = await memberRepository.findById('m1');
    expect(stored?.filhos).toEqual([
      { id: 'f1', nome: 'Eduardo Garcez de Moares', aniversarioDia: 7, aniversarioMes: 12 },
    ]);
  });

  it('remove filho com nome idêntico repetido', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(
      buildMember({
        filhos: [
          { id: 'f1', nome: 'Daniel Ferreira de Sousa', aniversarioDia: 25, aniversarioMes: 1 },
          { id: 'f2', nome: 'Daniel Ferreira de Sousa', aniversarioDia: 25, aniversarioMes: 1 },
        ],
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stored = await memberRepository.findById('m1');
    expect(stored?.filhos).toHaveLength(1);
  });

  it('não remove filhos com nomes parecidos mas datas diferentes', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(
      buildMember({
        filhos: [
          { id: 'f1', nome: 'Eduardo Garcez de Moares', aniversarioDia: 7, aniversarioMes: 12 },
          { id: 'f2', nome: 'Eduardo Garcez de Moraes', aniversarioDia: 20, aniversarioMes: 3 },
        ],
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(0);
    const stored = await memberRepository.findById('m1');
    expect(stored?.filhos).toHaveLength(2);
  });

  it('não remove filhos com nomes claramente diferentes, mesmo na mesma data', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(
      buildMember({
        filhos: [
          { id: 'f1', nome: 'Ana Clara', aniversarioDia: 7, aniversarioMes: 12 },
          { id: 'f2', nome: 'Bruno Lima', aniversarioDia: 7, aniversarioMes: 12 },
        ],
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(0);
    const stored = await memberRepository.findById('m1');
    expect(stored?.filhos).toHaveLength(2);
  });

  it('não mexe em quem não tem filhos duplicados', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(
      buildMember({
        filhos: [{ id: 'f1', nome: 'Único Filho', aniversarioDia: 1, aniversarioMes: 1 }],
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(0);
  });

  it('lança ForbiddenError sem a permissão member:manage', async () => {
    const { useCase } = buildDeps();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });
});
