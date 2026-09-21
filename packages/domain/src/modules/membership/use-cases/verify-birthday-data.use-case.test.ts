import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryMemberRepository } from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { computeBirthYear } from './import-birthday-data.use-case';
import { VerifyBirthdayDataUseCase } from './verify-birthday-data.use-case';

const REPORT_DATE = new Date(2026, 8, 14); // 14/09/2026

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:manage'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'Antônio Ricardo Alves Padilha',
    fotoUrl: null,
    email: 'antonio@example.com',
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: '001',
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'ativo',
    lojaId: 't1',
    potencia: 'GOB',
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
    dataFalecimento: null,
    mensagemHomenagem: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new VerifyBirthdayDataUseCase({
    memberRepository,
    clock: new FixedClock(REPORT_DATE),
  });
  return { useCase, memberRepository };
}

describe('VerifyBirthdayDataUseCase', () => {
  it('corrige dia/mês do próprio Irmão quando não bate com o relatório, preservando o ano esperado', async () => {
    const { useCase, memberRepository } = buildUseCase();
    // Cadastrado com 21/09 por engano — relatório diz 22/09.
    const anoErrado = computeBirthYear(REPORT_DATE, 9, 22, 62);
    await memberRepository.create(buildMember({ dataNascimento: new Date(anoErrado, 8, 21) }));

    const result = await useCase.execute(ctx, {
      reportDate: REPORT_DATE,
      irmaos: [{ nomeCompleto: 'Antônio Ricardo Alves Padilha', dia: 22, mes: 9, anos: 62 }],
      conjuges: [],
      filhos: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]).toMatchObject({
      tipo: 'irmao',
      nome: 'Antônio Ricardo Alves Padilha',
      diaAtual: 21,
      mesAtual: 9,
      diaEsperado: 22,
      mesEsperado: 9,
      corrigido: true,
    });

    const stored = await memberRepository.findById('member-1');
    expect(stored?.dataNascimento).toEqual(new Date(anoErrado, 8, 22));
  });

  it('não mexe em quem já bate com o relatório', async () => {
    const { useCase, memberRepository } = buildUseCase();
    const ano = computeBirthYear(REPORT_DATE, 9, 22, 62);
    await memberRepository.create(buildMember({ dataNascimento: new Date(ano, 8, 22) }));

    const result = await useCase.execute(ctx, {
      reportDate: REPORT_DATE,
      irmaos: [{ nomeCompleto: 'Antônio Ricardo Alves Padilha', dia: 22, mes: 9, anos: 62 }],
      conjuges: [],
      filhos: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(0);
  });

  it('corrige conjugeAniversarioDia/Mes quando não bate, sem inventar data completa', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(
      buildMember({
        conjugeNome: 'Sandra Cabral Peres Padilha',
        conjugeAniversarioDia: 2,
        conjugeAniversarioMes: 1,
      }),
    );

    const result = await useCase.execute(ctx, {
      reportDate: REPORT_DATE,
      irmaos: [],
      conjuges: [
        {
          irmaoNome: 'Antônio Ricardo Alves Padilha',
          conjugeNome: 'Sandra Cabral Peres Padilha',
          dia: 3,
          mes: 1,
        },
      ],
      filhos: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]).toMatchObject({ tipo: 'conjuge', diaAtual: 2, diaEsperado: 3 });

    const stored = await memberRepository.findById('member-1');
    expect(stored?.conjugeAniversarioDia).toBe(3);
    expect(stored?.conjugeAniversarioMes).toBe(1);
    expect(stored?.conjugeDataNascimento).toBeNull();
  });

  it('corrige o aniversário de um filho identificado por nome, sem mexer nos demais', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(
      buildMember({
        filhos: [
          { id: 'f1', nome: 'Ricardo Cruz Padilha', aniversarioDia: 6, aniversarioMes: 7 },
          {
            id: 'f2',
            nome: 'Fernanda Cabral Padilha Bacca',
            aniversarioDia: 27,
            aniversarioMes: 12,
          },
        ],
      }),
    );

    const result = await useCase.execute(ctx, {
      reportDate: REPORT_DATE,
      irmaos: [],
      conjuges: [],
      filhos: [
        {
          irmaoNome: 'Antônio Ricardo Alves Padilha',
          nome: 'Ricardo Cruz Padilha',
          dia: 7,
          mes: 7,
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]).toMatchObject({
      tipo: 'filho',
      nome: 'Ricardo Cruz Padilha',
      diaAtual: 6,
      diaEsperado: 7,
    });

    const stored = await memberRepository.findById('member-1');
    expect(stored?.filhos).toEqual([
      { id: 'f1', nome: 'Ricardo Cruz Padilha', aniversarioDia: 7, aniversarioMes: 7 },
      { id: 'f2', nome: 'Fernanda Cabral Padilha Bacca', aniversarioDia: 27, aniversarioMes: 12 },
    ]);
  });

  it('ignora quem não tem cadastro correspondente ou ainda não tem a data preenchida', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ dataNascimento: null }));

    const result = await useCase.execute(ctx, {
      reportDate: REPORT_DATE,
      irmaos: [
        { nomeCompleto: 'Antônio Ricardo Alves Padilha', dia: 22, mes: 9, anos: 62 },
        { nomeCompleto: 'Ninguém Cadastrado', dia: 1, mes: 1, anos: 30 },
      ],
      conjuges: [],
      filhos: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(0);
  });

  it('lança ForbiddenError sem a permissão member:manage', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(
      useCase.execute(semPermissao, {
        reportDate: REPORT_DATE,
        irmaos: [],
        conjuges: [],
        filhos: [],
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
