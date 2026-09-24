import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryBoardPositionAssignmentRepository,
  InMemoryBoardTermRepository,
  InMemoryMemberPositionHistoryRepository,
  InMemoryMemberRepository,
  InMemoryMemberTitleRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { BoardTerm } from '../entities/board-term.entity';
import type { Member } from '../../membership/entities/member.entity';
import { AssignBoardPositionUseCase } from './assign-board-position.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['boardTerm:manage'],
};

const term: BoardTerm = {
  id: 'term-1',
  tenantId: 't1',
  nome: 'Gestão 2026/2027',
  periodoInicio: new Date('2026-01-01'),
  periodoFim: new Date('2027-12-31'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function buildMember(id: string): Member {
  return {
    id,
    tenantId: 't1',
    userId: null,
    nomeCompleto: `Irmão ${id}`,
    fotoUrl: null,
    email: `${id}@vl6.org.br`,
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: id,
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
    conjugeAniversarioDia: null,
    conjugeAniversarioMes: null,
    filhos: [],
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: false,
    dataFalecimento: null,
    mensagemHomenagem: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
}

function buildUseCase() {
  const boardTermRepository = new InMemoryBoardTermRepository();
  const assignmentRepository = new InMemoryBoardPositionAssignmentRepository();
  const memberRepository = new InMemoryMemberRepository();
  const positionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
  const memberTitleRepository = new InMemoryMemberTitleRepository();
  const useCase = new AssignBoardPositionUseCase({
    boardTermRepository,
    assignmentRepository,
    memberRepository,
    positionHistoryRepository,
    memberTitleRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return {
    useCase,
    boardTermRepository,
    assignmentRepository,
    memberRepository,
    positionHistoryRepository,
    memberTitleRepository,
  };
}

describe('AssignBoardPositionUseCase', () => {
  it('atribui um cargo de ocorrência única e grava o histórico', async () => {
    const { useCase, boardTermRepository, memberRepository, positionHistoryRepository } =
      buildUseCase();
    await boardTermRepository.create(term);
    await memberRepository.create(buildMember('m1'));

    const result = await useCase.execute(ctx, {
      gestaoId: 'term-1',
      cargo: 'secretario',
      memberId: 'm1',
      ordem: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.memberId).toBe('m1');

    const member = await memberRepository.findById('m1');
    expect(member?.cargoAtualId).toBe(result.value.id);

    const history = await positionHistoryRepository.listByMemberId('m1');
    expect(history).toHaveLength(1);
    expect(history[0]?.cargo).toBe('secretario');
  });

  it('substitui o titular de um cargo de ocorrência única e encerra o histórico do antigo', async () => {
    const { useCase, boardTermRepository, memberRepository, positionHistoryRepository } =
      buildUseCase();
    await boardTermRepository.create(term);
    await memberRepository.create(buildMember('m1'));
    await memberRepository.create(buildMember('m2'));

    await useCase.execute(ctx, {
      gestaoId: 'term-1',
      cargo: 'secretario',
      memberId: 'm1',
      ordem: 1,
    });
    const result = await useCase.execute(ctx, {
      gestaoId: 'term-1',
      cargo: 'secretario',
      memberId: 'm2',
      ordem: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.memberId).toBe('m2');

    const oldMember = await memberRepository.findById('m1');
    expect(oldMember?.cargoAtualId).toBeNull();
    const oldHistory = await positionHistoryRepository.listByMemberId('m1');
    expect(oldHistory[0]?.dataFim).not.toBeNull();

    const newMember = await memberRepository.findById('m2');
    expect(newMember?.cargoAtualId).toBe(result.value.id);
  });

  it('permite múltiplos titulares para Diácono', async () => {
    const { useCase, boardTermRepository, memberRepository, assignmentRepository } = buildUseCase();
    await boardTermRepository.create(term);
    await memberRepository.create(buildMember('m1'));
    await memberRepository.create(buildMember('m2'));

    await useCase.execute(ctx, { gestaoId: 'term-1', cargo: 'diacono', memberId: 'm1', ordem: 1 });
    await useCase.execute(ctx, { gestaoId: 'term-1', cargo: 'diacono', memberId: 'm2', ordem: 2 });

    const assignments = await assignmentRepository.listByGestao('term-1');
    expect(assignments.filter((a) => a.cargo === 'diacono')).toHaveLength(2);
  });

  it('concede Mestre Instalado ao Venerável Mestre que sai do cargo', async () => {
    const { useCase, boardTermRepository, memberRepository, memberTitleRepository } =
      buildUseCase();
    await boardTermRepository.create(term);
    await memberRepository.create(buildMember('m1'));
    await memberRepository.create(buildMember('m2'));

    await useCase.execute(ctx, {
      gestaoId: 'term-1',
      cargo: 'veneravel_mestre',
      memberId: 'm1',
      ordem: 1,
    });
    // Ainda no cargo — não vira Mestre Instalado antes de sair.
    expect(await memberTitleRepository.listByMemberId('t1', 'm1')).toHaveLength(0);

    await useCase.execute(ctx, {
      gestaoId: 'term-1',
      cargo: 'veneravel_mestre',
      memberId: 'm2',
      ordem: 1,
    });

    const titles = await memberTitleRepository.listByMemberId('t1', 'm1');
    expect(titles).toHaveLength(1);
    expect(titles[0]?.titulo).toBe('mestre_instalado');
    // Concedido no dia seguinte ao fim do cargo (clock fixo em 2026-06-01).
    expect(titles[0]?.dataConcessao?.toISOString().slice(0, 10)).toBe('2026-06-02');

    // Não mexe em quem não foi Venerável — só encerra o cargo, sem título.
    expect(await memberTitleRepository.listByMemberId('t1', 'm2')).toHaveLength(0);
  });

  it('concede um novo Mestre Instalado mesmo se o Irmão já tiver um de outra gestão', async () => {
    // Correção de regra: um Irmão pode ser Venerável Mestre mais de uma vez, e cada
    // gestão concluída gera seu próprio título de Mestre Instalado (antes, um Irmão
    // nunca acumulava um segundo registro — regra institucional revista).
    const { useCase, boardTermRepository, memberRepository, memberTitleRepository } =
      buildUseCase();
    await boardTermRepository.create(term);
    await memberRepository.create(buildMember('m1'));
    await memberRepository.create(buildMember('m2'));
    await memberTitleRepository.create({
      id: 'title-pre',
      tenantId: 't1',
      memberId: 'm1',
      titulo: 'mestre_instalado',
      tituloOutro: null,
      dataConcessao: new Date('2010-01-01'),
      fundamento: null,
      createdAt: new Date('2010-01-01'),
      updatedAt: new Date('2010-01-01'),
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });

    await useCase.execute(ctx, {
      gestaoId: 'term-1',
      cargo: 'veneravel_mestre',
      memberId: 'm1',
      ordem: 1,
    });
    await useCase.execute(ctx, {
      gestaoId: 'term-1',
      cargo: 'veneravel_mestre',
      memberId: 'm2',
      ordem: 1,
    });

    const titles = await memberTitleRepository.listByMemberId('t1', 'm1');
    expect(titles).toHaveLength(2);
    expect(titles.map((t) => t.dataConcessao?.toISOString().slice(0, 10)).sort()).toEqual([
      '2010-01-01',
      '2026-06-02',
    ]);
  });

  it('não duplica o título de Mestre Instalado para o mesmo encerramento de gestão', async () => {
    const { useCase, boardTermRepository, memberRepository, memberTitleRepository } =
      buildUseCase();
    await boardTermRepository.create(term);
    await memberRepository.create(buildMember('m1'));
    // Concessão já registrada para o MESMO dia que este encerramento geraria
    // (clock fixo em 2026-06-01 -> concessão em 2026-06-02) — simula reprocessamento
    // do mesmo evento, que não deve duplicar.
    await memberTitleRepository.create({
      id: 'title-pre',
      tenantId: 't1',
      memberId: 'm1',
      titulo: 'mestre_instalado',
      tituloOutro: null,
      dataConcessao: new Date('2026-06-02'),
      fundamento: null,
      createdAt: new Date('2026-06-02'),
      updatedAt: new Date('2026-06-02'),
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });

    await useCase.execute(ctx, {
      gestaoId: 'term-1',
      cargo: 'veneravel_mestre',
      memberId: 'm1',
      ordem: 1,
    });

    expect(await memberTitleRepository.listByMemberId('t1', 'm1')).toHaveLength(1);
  });
});
