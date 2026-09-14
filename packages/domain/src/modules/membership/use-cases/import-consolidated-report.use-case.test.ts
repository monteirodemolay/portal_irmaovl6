import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryMemberRepository, SequentialIdGenerator } from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { ImportConsolidatedReportUseCase } from './import-consolidated-report.use-case';

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
  const useCase = new ImportConsolidatedReportUseCase({
    memberRepository,
    clock: new FixedClock(new Date('2026-09-14')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, memberRepository };
}

describe('ImportConsolidatedReportUseCase', () => {
  it('preenche data de iniciação, aniversário do Irmão, cônjuge, casamento e familiares', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ nomeCompleto: 'Sergio Ferreira dos Santos' }));

    const results = await useCase.execute(ctx, [
      {
        nomeCompleto: 'Sergio Ferreira dos Santos',
        aniversarioDia: 2,
        aniversarioMes: 9,
        dataIniciacao: new Date(2010, 0, 26),
        conjugeNome: 'Paula Rosana Monteiro Ribeiro dos Santos',
        conjugeAniversarioDia: 7,
        conjugeAniversarioMes: 1,
        dataCasamento: new Date(2005, 5, 10),
        familiares: [
          { nome: 'Bárbara Meireles Santos', dia: 5, mes: 6 },
          { nome: 'Catarina Meireles Santos', dia: 22, mes: 12 },
        ],
      },
    ]);

    expect(results[0]?.status).toBe('atualizado');
    const updated = await memberRepository.findById('member-1');
    expect(updated?.dataIniciacao).toEqual(new Date(2010, 0, 26));
    expect(updated?.aniversarioDia).toBe(2);
    expect(updated?.aniversarioMes).toBe(9);
    expect(updated?.conjugeNome).toBe('Paula Rosana Monteiro Ribeiro dos Santos');
    expect(updated?.conjugeAniversarioDia).toBe(7);
    expect(updated?.dataCasamento).toEqual(new Date(2005, 5, 10));
    expect(updated?.filhos).toHaveLength(2);
  });

  it('nunca sobrescreve dado já preenchido', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(
      buildMember({
        nomeCompleto: 'Fulano',
        dataIniciacao: new Date(2000, 0, 1),
        dataNascimento: new Date(1980, 0, 1),
        conjugeNome: 'Já Cadastrada',
        conjugeDataNascimento: new Date(1985, 0, 1),
        dataCasamento: new Date(2003, 0, 1),
      }),
    );

    const results = await useCase.execute(ctx, [
      {
        nomeCompleto: 'Fulano',
        aniversarioDia: 5,
        aniversarioMes: 6,
        dataIniciacao: new Date(2020, 0, 1),
        conjugeNome: 'Outra',
        conjugeAniversarioDia: 5,
        conjugeAniversarioMes: 6,
        dataCasamento: new Date(2020, 0, 1),
        familiares: [],
      },
    ]);

    expect(results[0]?.status).toBe('sem_alteracao');
    const member = await memberRepository.findById('member-1');
    expect(member?.dataIniciacao).toEqual(new Date(2000, 0, 1));
    expect(member?.conjugeNome).toBe('Já Cadastrada');
    expect(member?.dataCasamento).toEqual(new Date(2003, 0, 1));
  });

  it('reporta sem cadastro correspondente quando o nome não casa', async () => {
    const { useCase } = buildUseCase();

    const results = await useCase.execute(ctx, [
      {
        nomeCompleto: 'Ninguém Cadastrado',
        aniversarioDia: 1,
        aniversarioMes: 1,
        dataIniciacao: null,
        conjugeNome: null,
        conjugeAniversarioDia: null,
        conjugeAniversarioMes: null,
        dataCasamento: null,
        familiares: [],
      },
    ]);

    expect(results[0]?.status).toBe('nao_encontrado');
  });

  it('ignora um familiar cujo nome é o próprio Irmão (erro de origem na planilha)', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ nomeCompleto: 'Arício Vieira da Silva Júnior' }));

    const results = await useCase.execute(ctx, [
      {
        nomeCompleto: 'Arício Vieira da Silva Júnior',
        aniversarioDia: null,
        aniversarioMes: null,
        dataIniciacao: null,
        conjugeNome: null,
        conjugeAniversarioDia: null,
        conjugeAniversarioMes: null,
        dataCasamento: null,
        familiares: [
          { nome: 'ARÍCIO VIEIRA DA SILVA JÚNIOR', dia: 11, mes: 5 },
          { nome: 'João Lucas Castro Vieira', dia: 8, mes: 12 },
        ],
      },
    ]);

    expect(results[0]?.status).toBe('atualizado');
    const member = await memberRepository.findById('member-1');
    expect(member?.filhos).toHaveLength(1);
    expect(member?.filhos[0]?.nome).toBe('João Lucas Castro Vieira');
  });

  it('evita duplicar um familiar já cadastrado', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(
      buildMember({
        nomeCompleto: 'Fulano',
        filhos: [{ id: 'f0', nome: 'Já Existe', aniversarioDia: 1, aniversarioMes: 1 }],
      }),
    );

    const results = await useCase.execute(ctx, [
      {
        nomeCompleto: 'Fulano',
        aniversarioDia: null,
        aniversarioMes: null,
        dataIniciacao: null,
        conjugeNome: null,
        conjugeAniversarioDia: null,
        conjugeAniversarioMes: null,
        dataCasamento: null,
        familiares: [{ nome: 'já existe', dia: 1, mes: 1 }],
      },
    ]);

    expect(results[0]?.status).toBe('sem_alteracao');
    const member = await memberRepository.findById('member-1');
    expect(member?.filhos).toHaveLength(1);
  });

  it('rejeita quem não tem permissão member:update', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(ctxSemPermissao, [])).rejects.toThrow(
      'Permissão ausente: member:update.',
    );
  });
});
