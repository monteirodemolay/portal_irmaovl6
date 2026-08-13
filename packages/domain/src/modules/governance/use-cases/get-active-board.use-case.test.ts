import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  InMemoryBoardPositionAssignmentRepository,
  InMemoryBoardTermRepository,
  InMemoryMemberRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { BoardTerm } from '../entities/board-term.entity';
import type { BoardPositionAssignment } from '../entities/board-position-assignment.entity';
import { GetActiveBoardUseCase } from './get-active-board.use-case';

const ctx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['boardTerm:read'],
};

const forbiddenCtx: AuthContext = {
  uid: 'user-2',
  tenantId: 't1',
  roleId: 'r2',
  permissions: [],
};

const activeTerm: BoardTerm = {
  id: 'term-1',
  tenantId: 't1',
  nome: 'Gestão 2026/2027',
  periodoInicio: new Date('2026-01-01'),
  periodoFim: new Date('2027-12-31'),
  createdAt: new Date('2025-12-01'),
  updatedAt: new Date('2025-12-01'),
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

function buildAssignment(
  id: string,
  gestaoId: string,
  memberId: string,
  ordem: number,
): BoardPositionAssignment {
  return {
    id,
    tenantId: 't1',
    gestaoId,
    cargo: ordem === 1 ? 'veneravel_mestre' : 'secretario',
    memberId,
    ordem,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
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
  const useCase = new GetActiveBoardUseCase({
    boardTermRepository,
    assignmentRepository,
    memberRepository,
  });
  return { useCase, boardTermRepository, assignmentRepository, memberRepository };
}

describe('GetActiveBoardUseCase', () => {
  it('retorna a gestão vigente com os assentos ordenados e Irmãos resolvidos', async () => {
    const { useCase, boardTermRepository, assignmentRepository, memberRepository } = buildUseCase();
    await boardTermRepository.create(activeTerm);
    await memberRepository.create(buildMember('m1'));
    await memberRepository.create(buildMember('m2'));
    await assignmentRepository.create(buildAssignment('a2', 'term-1', 'm2', 2));
    await assignmentRepository.create(buildAssignment('a1', 'term-1', 'm1', 1));

    const board = await useCase.execute(ctx);

    expect(board).not.toBeNull();
    expect(board?.term.id).toBe('term-1');
    expect(board?.seats).toHaveLength(2);
    expect(board?.seats[0]?.member.id).toBe('m1');
    expect(board?.seats[1]?.member.id).toBe('m2');
  });

  it('lança ForbiddenError quando falta a permissão boardTerm:read', async () => {
    const { useCase, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(activeTerm);

    await expect(useCase.execute(forbiddenCtx)).rejects.toThrow(ForbiddenError);
  });

  it('retorna null quando não há gestão vigente', async () => {
    const { useCase } = buildUseCase();

    const board = await useCase.execute(ctx);

    expect(board).toBeNull();
  });
});
