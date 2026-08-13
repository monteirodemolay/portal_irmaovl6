import { describe, expect, it } from 'vitest';
import {
  InMemoryBoardPositionAssignmentRepository,
  InMemoryBoardTermRepository,
  InMemoryMemberRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { BoardTerm } from '../entities/board-term.entity';
import type { BoardPositionAssignment } from '../entities/board-position-assignment.entity';
import { GetPublicBoardUseCase } from './get-public-board.use-case';

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
  const useCase = new GetPublicBoardUseCase({
    boardTermRepository,
    assignmentRepository,
    memberRepository,
  });
  return { useCase, boardTermRepository, assignmentRepository, memberRepository };
}

describe('GetPublicBoardUseCase', () => {
  it('retorna a diretoria vigente publicamente, sem exigir AuthContext', async () => {
    const { useCase, boardTermRepository, assignmentRepository, memberRepository } = buildUseCase();
    await boardTermRepository.create(activeTerm);
    await memberRepository.create(buildMember('m1'));
    await assignmentRepository.create(buildAssignment('a1', 'term-1', 'm1', 1));

    const board = await useCase.execute('t1');

    expect(board).not.toBeNull();
    expect(board?.term.id).toBe('term-1');
    expect(board?.seats).toHaveLength(1);
    expect(board?.seats[0]?.member.id).toBe('m1');
  });

  it('retorna null quando o tenant não tem gestão vigente', async () => {
    const { useCase } = buildUseCase();

    const board = await useCase.execute('t1');

    expect(board).toBeNull();
  });
});
