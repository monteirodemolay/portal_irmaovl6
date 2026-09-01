import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryMemberRepository,
  InMemoryMemberSituationRecordRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { SeedMemberSituationHistoryUseCase } from './seed-member-situation-history.use-case';

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
    id: 'm1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'Fulano de Tal',
    fotoUrl: null,
    email: 'fulano@vl6.org.br',
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: '123',
    grau: 'mestre',
    cargoAtualId: null,
    // Valor legado sobrevivendo em runtime (Firestore ainda não migrado) —
    // o `as` reflete exatamente esse cenário de transição.
    situacao: 'regular' as Member['situacao'],
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
    createdAt: new Date('2020-01-01T00:00:00Z'),
    updatedAt: new Date('2020-01-01T00:00:00Z'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase(members: Member[]) {
  const memberRepository = new InMemoryMemberRepository();
  for (const member of members) memberRepository.create(member);
  const situationRecordRepository = new InMemoryMemberSituationRecordRepository();
  const useCase = new SeedMemberSituationHistoryUseCase({
    memberRepository,
    situationRecordRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, memberRepository, situationRecordRepository };
}

describe('SeedMemberSituationHistoryUseCase', () => {
  it('migra "transferido" pra "desligado"/transferência sem precisar de revisão', async () => {
    const { useCase, situationRecordRepository } = buildUseCase([
      buildMember({
        situacao: 'transferido' as Member['situacao'],
        dataIniciacao: new Date('2015-10-21T00:00:00Z'),
      }),
    ]);

    const report = await useCase.execute(ctx);

    expect(report).toHaveLength(1);
    expect(report[0]?.situacaoNova).toBe('desligado');
    expect(report[0]?.precisaRevisao).toBe(false);

    const historico = await situationRecordRepository.listByMemberId('m1');
    expect(historico).toHaveLength(1);
    expect(historico[0]?.situacao).toBe('desligado');
    expect(historico[0]?.motivo).toBe('transferencia_outra_loja');
  });

  it('marca "irregular" e "inativo" como pendentes de revisão manual', async () => {
    const { useCase } = buildUseCase([
      buildMember({ id: 'm1', situacao: 'irregular' as Member['situacao'] }),
      buildMember({
        id: 'm2',
        situacao: 'inativo' as Member['situacao'],
        email: 'outro@vl6.org.br',
      }),
    ]);

    const report = await useCase.execute(ctx);

    expect(report).toHaveLength(2);
    expect(report.every((row) => row.precisaRevisao)).toBe(true);
  });

  it('usa dataIniciacao quando disponível, sem marcar como estimada', async () => {
    const { useCase, situationRecordRepository } = buildUseCase([
      buildMember({
        situacao: 'regular' as Member['situacao'],
        dataIniciacao: new Date('2015-10-21T00:00:00Z'),
      }),
    ]);

    await useCase.execute(ctx);

    const historico = await situationRecordRepository.listByMemberId('m1');
    expect(historico[0]?.dataInicio).toEqual(new Date('2015-10-21T00:00:00Z'));
    expect(historico[0]?.dataInicioEstimada).toBe(false);
  });

  it('usa a data de cadastro e marca como estimada quando não há dataIniciacao', async () => {
    const { useCase, situationRecordRepository } = buildUseCase([
      buildMember({ situacao: 'regular' as Member['situacao'], dataIniciacao: null }),
    ]);

    const report = await useCase.execute(ctx);

    const historico = await situationRecordRepository.listByMemberId('m1');
    expect(historico[0]?.dataInicioEstimada).toBe(true);
    expect(report[0]?.precisaRevisao).toBe(true);
  });

  it('é idempotente — pula Irmão que já tem histórico', async () => {
    const { useCase, situationRecordRepository } = buildUseCase([buildMember()]);

    const firstReport = await useCase.execute(ctx);
    expect(firstReport).toHaveLength(1);

    const secondReport = await useCase.execute(ctx);
    expect(secondReport).toHaveLength(0);

    const historico = await situationRecordRepository.listByMemberId('m1');
    expect(historico).toHaveLength(1);
  });

  it('lança ForbiddenError quando falta a permissão member:manage', async () => {
    const { useCase } = buildUseCase([buildMember()]);

    await expect(useCase.execute(readOnlyCtx)).rejects.toThrow(ForbiddenError);
  });
});
