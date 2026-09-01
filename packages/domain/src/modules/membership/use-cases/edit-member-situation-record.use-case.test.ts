import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryMemberSituationRecordRepository } from '../../../test/fakes';
import type { MemberSituationRecord } from '../entities/member-situation-record.entity';
import { EditMemberSituationRecordUseCase } from './edit-member-situation-record.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:update'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['member:read'],
};

function buildRecord(overrides: Partial<MemberSituationRecord> = {}): MemberSituationRecord {
  return {
    id: 'rec-1',
    tenantId: 't1',
    memberId: 'm1',
    situacao: 'desligado',
    motivo: 'quite_placet',
    motivoOutroDescricao: null,
    dataInicio: new Date('2023-03-15T00:00:00Z'),
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
    createdAt: new Date('2023-03-15T00:00:00Z'),
    updatedAt: new Date('2023-03-15T00:00:00Z'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase(records: MemberSituationRecord[]) {
  const situationRecordRepository = new InMemoryMemberSituationRecordRepository();
  for (const record of records) situationRecordRepository.create(record);
  const useCase = new EditMemberSituationRecordUseCase({
    situationRecordRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
  });
  return { useCase, situationRecordRepository };
}

describe('EditMemberSituationRecordUseCase', () => {
  it('corrige o número do documento com justificativa', async () => {
    const { useCase, situationRecordRepository } = buildUseCase([buildRecord()]);

    const result = await useCase.execute(ctx, 'rec-1', {
      documentoNumero: '012/2023',
      justificativa: 'Número do documento não havia sido lançado.',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.documentoNumero).toBe('012/2023');
    expect(result.value.justificativaEdicaoRetroativa).toBe(
      'Número do documento não havia sido lançado.',
    );

    const stored = await situationRecordRepository.findById('rec-1');
    expect(stored?.documentoNumero).toBe('012/2023');
  });

  it('exige justificativa', async () => {
    const { useCase } = buildUseCase([buildRecord()]);

    const result = await useCase.execute(ctx, 'rec-1', {
      documentoNumero: '012/2023',
      justificativa: '',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('recalcula a dataFim do registro anterior ao corrigir a dataInicio', async () => {
    const anterior = buildRecord({
      id: 'rec-anterior',
      situacao: 'ativo',
      motivo: 'iniciacao',
      dataInicio: new Date('2015-10-21T00:00:00Z'),
      dataFim: new Date('2023-03-15T00:00:00Z'),
      vigente: false,
    });
    const atual = buildRecord({ id: 'rec-1', dataInicio: new Date('2023-03-15T00:00:00Z') });
    const { useCase, situationRecordRepository } = buildUseCase([anterior, atual]);

    const novaData = new Date('2023-03-20T00:00:00Z');
    const result = await useCase.execute(ctx, 'rec-1', {
      dataInicio: novaData,
      justificativa: 'Data correta conforme documento reencontrado.',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dataInicio).toEqual(novaData);

    const anteriorAtualizado = await situationRecordRepository.findById('rec-anterior');
    expect(anteriorAtualizado?.dataFim).toEqual(novaData);
  });

  it('rejeita dataInicio que ultrapassa o registro anterior', async () => {
    const anterior = buildRecord({
      id: 'rec-anterior',
      situacao: 'ativo',
      motivo: 'iniciacao',
      dataInicio: new Date('2015-10-21T00:00:00Z'),
      dataFim: new Date('2023-03-15T00:00:00Z'),
      vigente: false,
    });
    const atual = buildRecord({ id: 'rec-1', dataInicio: new Date('2023-03-15T00:00:00Z') });
    const { useCase } = buildUseCase([anterior, atual]);

    const result = await useCase.execute(ctx, 'rec-1', {
      dataInicio: new Date('2010-01-01T00:00:00Z'),
      justificativa: 'teste',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('lança ForbiddenError quando falta a permissão member:update', async () => {
    const { useCase } = buildUseCase([buildRecord()]);

    await expect(
      useCase.execute(readOnlyCtx, 'rec-1', {
        documentoNumero: '012/2023',
        justificativa: 'teste',
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
