import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryMemberRepository,
  InMemoryMemberSituationRecordRepository,
} from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import type { MemberSituationRecord } from '../entities/member-situation-record.entity';
import { BackfillDataFalecimentoUseCase } from './backfill-data-falecimento.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:manage'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'm1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'Fulano de Tal',
    fotoUrl: null,
    email: null,
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: new Date('2003-11-23'),
    dataElevacao: null,
    dataExaltacao: null,
    cim: null,
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'falecido',
    dataFalecimento: null,
    mensagemHomenagem: null,
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
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  } as Member;
}

function buildSituationRecord(
  overrides: Partial<MemberSituationRecord> = {},
): MemberSituationRecord {
  return {
    id: 'rec-1',
    tenantId: 't1',
    memberId: 'm1',
    situacao: 'falecido',
    motivo: 'passou_ao_oriente_eterno',
    motivoOutroDescricao: null,
    dataInicio: new Date('2023-06-15'),
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
    createdAt: new Date('2023-06-15'),
    updatedAt: new Date('2023-06-15'),
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
  const useCase = new BackfillDataFalecimentoUseCase({
    memberRepository,
    situationRecordRepository,
    clock: new FixedClock(new Date('2026-09-15')),
  });
  return { useCase, memberRepository, situationRecordRepository };
}

describe('BackfillDataFalecimentoUseCase', () => {
  it('preenche dataFalecimento a partir do registro vigente de situação', async () => {
    const { useCase, memberRepository, situationRecordRepository } = buildDeps();
    await memberRepository.create(buildMember());
    await situationRecordRepository.create(buildSituationRecord());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalFalecidosSemData).toBe(1);
    expect(result.value.corrigidos).toEqual([
      { memberId: 'm1', nomeCompleto: 'Fulano de Tal', dataFalecimento: new Date('2023-06-15') },
    ]);
    expect(result.value.semRegistroVigente).toHaveLength(0);

    const stored = await memberRepository.findById('m1');
    expect(stored?.dataFalecimento).toEqual(new Date('2023-06-15'));
  });

  it('não mexe em quem já tem dataFalecimento preenchida', async () => {
    const { useCase, memberRepository, situationRecordRepository } = buildDeps();
    await memberRepository.create(buildMember({ dataFalecimento: new Date('2020-01-01') }));
    await situationRecordRepository.create(buildSituationRecord());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalFalecidosSemData).toBe(0);
    expect(result.value.corrigidos).toHaveLength(0);
  });

  it('nunca mexe em quem não está falecido, mesmo sem dataFalecimento', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(buildMember({ situacao: 'ativo', dataFalecimento: null }));

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalFalecidosSemData).toBe(0);
  });

  it('reporta quem não tem registro vigente de situação pra revisão manual', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(buildMember());
    // sem criar o MemberSituationRecord correspondente

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.corrigidos).toHaveLength(0);
    expect(result.value.semRegistroVigente).toEqual([
      { memberId: 'm1', nomeCompleto: 'Fulano de Tal' },
    ]);
  });

  it('lança ForbiddenError sem a permissão member:manage', async () => {
    const { useCase } = buildDeps();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });
});
