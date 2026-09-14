import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryMemberRepository, SequentialIdGenerator } from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { computeBirthYear, ImportBirthdayDataUseCase } from './import-birthday-data.use-case';

const REPORT_DATE = new Date(2026, 8, 14); // 14/09/2026

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:update'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'Fulano de Tal',
    fotoUrl: null,
    email: 'fulano@example.com',
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
  const useCase = new ImportBirthdayDataUseCase({
    memberRepository,
    clock: new FixedClock(REPORT_DATE),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, memberRepository };
}

describe('computeBirthYear', () => {
  it('usa o ano corrente quando o aniversário já aconteceu na data do relatório', () => {
    expect(computeBirthYear(REPORT_DATE, 9, 2, 57)).toBe(1969);
  });

  it('usa o ano anterior quando o aniversário ainda não aconteceu', () => {
    expect(computeBirthYear(REPORT_DATE, 11, 14, 16)).toBe(2009);
  });

  it('trata o próprio dia do relatório como já acontecido', () => {
    expect(computeBirthYear(REPORT_DATE, 9, 14, 40)).toBe(1986);
  });
});

describe('ImportBirthdayDataUseCase', () => {
  it('preenche a data de nascimento do Irmão calculada a partir de dia/mês/idade', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ nomeCompleto: 'Sergio Ferreira dos Santos' }));

    const results = await useCase.execute(ctx, {
      reportDate: REPORT_DATE,
      irmaos: [{ nomeCompleto: 'Sergio Ferreira dos Santos', dia: 2, mes: 9, anos: 57 }],
      conjuges: [],
      filhos: [],
    });

    expect(results).toEqual([
      {
        tipo: 'irmao',
        nome: 'Sergio Ferreira dos Santos',
        irmaoBusca: 'Sergio Ferreira dos Santos',
        status: 'atualizado',
      },
    ]);
    const updated = await memberRepository.findById('member-1');
    expect(updated?.dataNascimento).toEqual(new Date(1969, 8, 2));
  });

  it('casa nomes ignorando acento e maiúscula/minúscula', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ nomeCompleto: 'Luís Eduardo Monteiro Lima' }));

    const results = await useCase.execute(ctx, {
      reportDate: REPORT_DATE,
      irmaos: [{ nomeCompleto: 'LUIS EDUARDO MONTEIRO LIMA', dia: 8, mes: 3, anos: 39 }],
      conjuges: [],
      filhos: [],
    });

    expect(results[0]?.status).toBe('atualizado');
  });

  it('nunca sobrescreve uma data de nascimento já preenchida', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(
      buildMember({ nomeCompleto: 'Fulano', dataNascimento: new Date(1980, 0, 1) }),
    );

    const results = await useCase.execute(ctx, {
      reportDate: REPORT_DATE,
      irmaos: [{ nomeCompleto: 'Fulano', dia: 2, mes: 9, anos: 57 }],
      conjuges: [],
      filhos: [],
    });

    expect(results[0]?.status).toBe('ja_preenchido');
    const member = await memberRepository.findById('member-1');
    expect(member?.dataNascimento).toEqual(new Date(1980, 0, 1));
  });

  it('reporta sem cadastro correspondente quando o nome não casa com nenhum Irmão', async () => {
    const { useCase } = buildUseCase();

    const results = await useCase.execute(ctx, {
      reportDate: REPORT_DATE,
      irmaos: [{ nomeCompleto: 'Ninguém Cadastrado', dia: 1, mes: 1, anos: 30 }],
      conjuges: [],
      filhos: [],
    });

    expect(results[0]?.status).toBe('nao_encontrado');
  });

  it('preenche o aniversário (dia/mês) da cônjuge sem sobrescrever nome já cadastrado', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(
      buildMember({ nomeCompleto: 'Fulano', conjugeNome: 'Já Cadastrada' }),
    );

    const results = await useCase.execute(ctx, {
      reportDate: REPORT_DATE,
      irmaos: [],
      conjuges: [{ irmaoNome: 'Fulano', conjugeNome: 'Outra', dia: 5, mes: 6 }],
      filhos: [],
    });

    expect(results[0]?.status).toBe('atualizado');
    const member = await memberRepository.findById('member-1');
    expect(member?.conjugeNome).toBe('Já Cadastrada');
    expect(member?.conjugeAniversarioDia).toBe(5);
    expect(member?.conjugeAniversarioMes).toBe(6);
  });

  it('não usa o fallback quando a cônjuge já tem data completa', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(
      buildMember({ nomeCompleto: 'Fulano', conjugeDataNascimento: new Date(1990, 0, 1) }),
    );

    const results = await useCase.execute(ctx, {
      reportDate: REPORT_DATE,
      irmaos: [],
      conjuges: [{ irmaoNome: 'Fulano', conjugeNome: 'Outra', dia: 5, mes: 6 }],
      filhos: [],
    });

    expect(results[0]?.status).toBe('ja_preenchido');
  });

  it('adiciona um filho novo e evita duplicar um já cadastrado', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(
      buildMember({
        nomeCompleto: 'Fulano',
        filhos: [{ id: 'f0', nome: 'Já Existe', aniversarioDia: 1, aniversarioMes: 1 }],
      }),
    );

    const results = await useCase.execute(ctx, {
      reportDate: REPORT_DATE,
      irmaos: [],
      conjuges: [],
      filhos: [
        { irmaoNome: 'Fulano', nome: 'Novo Filho', dia: 10, mes: 4 },
        { irmaoNome: 'Fulano', nome: 'já existe', dia: 1, mes: 1 },
      ],
    });

    expect(results.map((r) => r.status)).toEqual(['atualizado', 'ja_preenchido']);
    const member = await memberRepository.findById('member-1');
    expect(member?.filhos).toHaveLength(2);
    expect(member?.filhos.map((f) => f.nome)).toEqual(['Já Existe', 'Novo Filho']);
  });

  it('rejeita quem não tem permissão member:update', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(
      useCase.execute(ctxSemPermissao, {
        reportDate: REPORT_DATE,
        irmaos: [],
        conjuges: [],
        filhos: [],
      }),
    ).rejects.toThrow('Permissão ausente: member:update.');
  });
});
