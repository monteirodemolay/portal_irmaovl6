import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryBoardPositionAssignmentRepository,
  InMemoryBoardTermRepository,
  InMemoryMemberPositionHistoryRepository,
  InMemoryMemberRepository,
  InMemoryMemberTitleRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { BoardTerm } from '../entities/board-term.entity';
import { AssignBoardPositionUseCase } from './assign-board-position.use-case';
import { RemoveBoardPositionUseCase } from './remove-board-position.use-case';

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

function buildUseCases() {
  const boardTermRepository = new InMemoryBoardTermRepository();
  const assignmentRepository = new InMemoryBoardPositionAssignmentRepository();
  const memberRepository = new InMemoryMemberRepository();
  const positionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
  const memberTitleRepository = new InMemoryMemberTitleRepository();
  const clock = new FixedClock(new Date('2026-06-01T00:00:00Z'));
  const idGenerator = new SequentialIdGenerator();
  const assignUseCase = new AssignBoardPositionUseCase({
    boardTermRepository,
    assignmentRepository,
    memberRepository,
    positionHistoryRepository,
    memberTitleRepository,
    clock,
    idGenerator,
  });
  const removeUseCase = new RemoveBoardPositionUseCase({
    assignmentRepository,
    memberRepository,
    positionHistoryRepository,
    memberTitleRepository,
    clock,
    idGenerator,
  });
  return {
    assignUseCase,
    removeUseCase,
    boardTermRepository,
    assignmentRepository,
    memberRepository,
    positionHistoryRepository,
    memberTitleRepository,
  };
}

describe('RemoveBoardPositionUseCase', () => {
  it('remove a atribuição, encerra o histórico e limpa cargoAtualId do Irmão', async () => {
    const {
      assignUseCase,
      removeUseCase,
      boardTermRepository,
      memberRepository,
      assignmentRepository,
      positionHistoryRepository,
    } = buildUseCases();
    await boardTermRepository.create(term);
    await memberRepository.create(buildMember('m1'));

    const assigned = await assignUseCase.execute(ctx, {
      gestaoId: 'term-1',
      cargo: 'secretario',
      memberId: 'm1',
      ordem: 1,
    });
    if (!assigned.ok) throw new Error('setup falhou');

    const result = await removeUseCase.execute(ctx, { assignmentId: assigned.value.id });
    expect(result.ok).toBe(true);

    expect(await assignmentRepository.findById(assigned.value.id)).toBeNull();
    const member = await memberRepository.findById('m1');
    expect(member?.cargoAtualId).toBeNull();
    const history = await positionHistoryRepository.listByMemberId('m1');
    expect(history[0]?.dataFim).not.toBeNull();
  });

  it('remove só uma ocorrência de Diácono, sem mexer na outra', async () => {
    const {
      assignUseCase,
      removeUseCase,
      boardTermRepository,
      memberRepository,
      assignmentRepository,
    } = buildUseCases();
    await boardTermRepository.create(term);
    await memberRepository.create(buildMember('m1'));
    await memberRepository.create(buildMember('m2'));

    const first = await assignUseCase.execute(ctx, {
      gestaoId: 'term-1',
      cargo: 'diacono',
      memberId: 'm1',
      ordem: 1,
    });
    await assignUseCase.execute(ctx, {
      gestaoId: 'term-1',
      cargo: 'diacono',
      memberId: 'm2',
      ordem: 2,
    });
    if (!first.ok) throw new Error('setup falhou');

    await removeUseCase.execute(ctx, { assignmentId: first.value.id });

    const remaining = await assignmentRepository.listByGestao('term-1');
    expect(remaining.filter((a) => a.cargo === 'diacono')).toHaveLength(1);
    expect(remaining.find((a) => a.cargo === 'diacono')?.memberId).toBe('m2');
  });

  it('concede Mestre Instalado ao remover o Venerável Mestre do cargo', async () => {
    const {
      assignUseCase,
      removeUseCase,
      boardTermRepository,
      memberRepository,
      memberTitleRepository,
    } = buildUseCases();
    await boardTermRepository.create(term);
    await memberRepository.create(buildMember('m1'));

    const assigned = await assignUseCase.execute(ctx, {
      gestaoId: 'term-1',
      cargo: 'veneravel_mestre',
      memberId: 'm1',
      ordem: 1,
    });
    if (!assigned.ok) throw new Error('setup falhou');

    await removeUseCase.execute(ctx, { assignmentId: assigned.value.id });

    const titles = await memberTitleRepository.listByMemberId('t1', 'm1');
    expect(titles).toHaveLength(1);
    expect(titles[0]?.titulo).toBe('mestre_instalado');
  });

  it('retorna NotFoundError para atribuição inexistente', async () => {
    const { removeUseCase } = buildUseCases();

    const result = await removeUseCase.execute(ctx, { assignmentId: 'nao-existe' });
    expect(result.ok).toBe(false);
  });

  it('lança ForbiddenError sem a permissão boardTerm:manage', async () => {
    const { removeUseCase } = buildUseCases();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(removeUseCase.execute(semPermissao, { assignmentId: 'qualquer' })).rejects.toThrow(
      ForbiddenError,
    );
  });
});
