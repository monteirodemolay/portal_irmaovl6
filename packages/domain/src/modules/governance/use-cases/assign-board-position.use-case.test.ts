import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryBoardPositionAssignmentRepository,
  InMemoryBoardTermRepository,
  InMemoryMemberPositionHistoryRepository,
  InMemoryMemberRepository,
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
    nomeMaconico: null,
    fotoUrl: null,
    email: `${id}@vl6.org.br`,
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: null,
    matricula: id,
    grau: 'mestre',
    cargoAtualId: null,
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
  const useCase = new AssignBoardPositionUseCase({
    boardTermRepository,
    assignmentRepository,
    memberRepository,
    positionHistoryRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return {
    useCase,
    boardTermRepository,
    assignmentRepository,
    memberRepository,
    positionHistoryRepository,
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
});
