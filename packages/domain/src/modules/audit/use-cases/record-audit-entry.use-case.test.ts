import { describe, expect, it } from 'vitest';
import { FixedClock, InMemoryAuditLogRepository, SequentialIdGenerator } from '../../../test/fakes';
import { RecordAuditEntryUseCase } from './record-audit-entry.use-case';

function buildUseCase() {
  const auditLogRepository = new InMemoryAuditLogRepository();
  const useCase = new RecordAuditEntryUseCase({
    auditLogRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, auditLogRepository };
}

describe('RecordAuditEntryUseCase', () => {
  it('grava a entrada de auditoria com id gerado e timestamp do relógio', async () => {
    const { useCase, auditLogRepository } = buildUseCase();

    const entry = await useCase.execute({
      tenantId: 't1',
      entidade: 'member',
      entidadeId: 'member-1',
      acao: 'update',
      usuarioId: 'admin-1',
      ip: '127.0.0.1',
      dispositivo: 'web',
      valorAnterior: { situacao: 'ativo' },
      valorNovo: { situacao: 'irregular' },
    });

    expect(entry.id).toBe('id-1');
    expect(entry.timestamp).toEqual(new Date('2026-06-01T00:00:00Z'));

    const result = await auditLogRepository.search({ tenantId: 't1' }, { limit: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(entry);
  });

  it('preserva ip e dispositivo nulos, comuns em gatilhos automáticos sem contexto de requisição', async () => {
    const { useCase, auditLogRepository } = buildUseCase();

    const entry = await useCase.execute({
      tenantId: 't1',
      entidade: 'member',
      entidadeId: 'member-1',
      acao: 'create',
      usuarioId: 'system',
      ip: null,
      dispositivo: null,
      valorAnterior: null,
      valorNovo: { situacao: 'ativo' },
    });

    expect(entry.ip).toBeNull();
    expect(entry.dispositivo).toBeNull();

    const result = await auditLogRepository.search({ tenantId: 't1' }, { limit: 20 });
    expect(result.items[0]?.id).toBe(entry.id);
  });
});
