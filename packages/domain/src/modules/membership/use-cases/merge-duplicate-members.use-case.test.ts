import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryMemberRepository,
  InMemoryMemberSituationRecordRepository,
  InMemoryMemberPositionHistoryRepository,
  InMemoryBoardPositionAssignmentRepository,
} from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import type { MemberPositionHistory } from '../entities/member-position-history.entity';
import type { MemberSituationRecord } from '../entities/member-situation-record.entity';
import type { BoardPositionAssignment } from '../../governance/entities/board-position-assignment.entity';
import { MergeDuplicateMembersUseCase } from './merge-duplicate-members.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:manage'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['member:read'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'Ivan Damasceno',
    fotoUrl: null,
    email: null,
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
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
  };
}

function buildHistory(overrides: Partial<MemberPositionHistory>): MemberPositionHistory {
  return {
    id: 'h1',
    tenantId: 't1',
    memberId: 'dup-1',
    cargo: 'veneravel_mestre',
    gestaoId: 'gestao-1',
    dataInicio: new Date('1994-06-01'),
    dataFim: new Date('1995-05-31'),
    observacoes: null,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildSituation(overrides: Partial<MemberSituationRecord>): MemberSituationRecord {
  return {
    id: 's1',
    tenantId: 't1',
    memberId: 'dup-1',
    situacao: 'ativo',
    motivo: 'outro',
    motivoOutroDescricao: null,
    dataInicio: new Date('2020-01-01'),
    dataFim: null,
    lojaId: 't1',
    potencia: 'GLEG',
    documentoNumero: null,
    documentoData: null,
    observacoes: null,
    anexos: [],
    vigente: true,
    dataInicioEstimada: false,
    justificativaEdicaoRetroativa: null,
    origem: null,
    sourceCode: null,
    sourceLabel: null,
    recordKind: null,
    lojaOrigemId: null,
    lojaDestinoId: null,
    importBatchId: null,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildAssignment(overrides: Partial<BoardPositionAssignment>): BoardPositionAssignment {
  return {
    id: 'a1',
    tenantId: 't1',
    gestaoId: 'gestao-1',
    cargo: 'veneravel_mestre',
    memberId: 'dup-1',
    ordem: 1,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildDeps() {
  const memberRepository = new InMemoryMemberRepository();
  const situationRecordRepository = new InMemoryMemberSituationRecordRepository();
  const positionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
  const assignmentRepository = new InMemoryBoardPositionAssignmentRepository();
  const useCase = new MergeDuplicateMembersUseCase({
    memberRepository,
    situationRecordRepository,
    positionHistoryRepository,
    assignmentRepository,
    clock: new FixedClock(new Date('2026-09-11T00:00:00Z')),
  });
  return {
    useCase,
    memberRepository,
    situationRecordRepository,
    positionHistoryRepository,
    assignmentRepository,
  };
}

describe('MergeDuplicateMembersUseCase', () => {
  it('reatribui histórico, situações e titularidades, e arquiva o duplicado', async () => {
    const deps = buildDeps();
    await deps.memberRepository.create(buildMember({ id: 'canon', fotoUrl: null }));
    await deps.memberRepository.create(buildMember({ id: 'dup-1', fotoUrl: 'https://x/foto.jpg' }));
    await deps.positionHistoryRepository.create(buildHistory({ id: 'h1', memberId: 'dup-1' }));
    await deps.situationRecordRepository.create(buildSituation({ id: 's1', memberId: 'dup-1' }));
    await deps.assignmentRepository.create(buildAssignment({ id: 'a1', memberId: 'dup-1' }));

    const result = await deps.useCase.execute(ctx, 'canon', ['dup-1']);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      canonicalMemberId: 'canon',
      cadastrosMesclados: 1,
      historicoDeCargosReatribuido: 1,
      situacoesReatribuidas: 1,
      titularidadesReatribuidas: 1,
      fotoAtualizada: true,
    });

    const history = await deps.positionHistoryRepository.listByMemberId('canon');
    expect(history).toHaveLength(1);
    const situations = await deps.situationRecordRepository.listByMemberId('canon');
    expect(situations).toHaveLength(1);
    const assignments = await deps.assignmentRepository.listByMemberId('canon');
    expect(assignments).toHaveLength(1);

    const canonical = await deps.memberRepository.findById('canon');
    expect(canonical?.fotoUrl).toBe('https://x/foto.jpg');

    const duplicate = await deps.memberRepository.findById('dup-1');
    expect(duplicate?.deletedAt).not.toBeNull();
    expect(duplicate?.ativo).toBe(false);
  });

  it('não sobrescreve a foto do canônico se ele já tiver uma', async () => {
    const deps = buildDeps();
    await deps.memberRepository.create(
      buildMember({ id: 'canon', fotoUrl: 'https://x/ja-tem.jpg' }),
    );
    await deps.memberRepository.create(
      buildMember({ id: 'dup-1', fotoUrl: 'https://x/outra.jpg' }),
    );

    const result = await deps.useCase.execute(ctx, 'canon', ['dup-1']);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fotoAtualizada).toBe(false);
    const canonical = await deps.memberRepository.findById('canon');
    expect(canonical?.fotoUrl).toBe('https://x/ja-tem.jpg');
  });

  it('recusa sem selecionar nenhum duplicado', async () => {
    const deps = buildDeps();
    await deps.memberRepository.create(buildMember({ id: 'canon' }));

    const result = await deps.useCase.execute(ctx, 'canon', []);
    expect(result.ok).toBe(false);
  });

  it('recusa sem permissão', async () => {
    const deps = buildDeps();
    await deps.memberRepository.create(buildMember({ id: 'canon' }));
    await deps.memberRepository.create(buildMember({ id: 'dup-1' }));
    await expect(deps.useCase.execute(readOnlyCtx, 'canon', ['dup-1'])).rejects.toThrow();
  });
});
