import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryAuditLogRepository } from '../../../test/fakes';
import type { AuditLog } from '../entities/audit-log.entity';
import { ListAuditLogUseCase } from './list-audit-log.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'role-admin',
  permissions: ['auditLog:read'],
};

function buildEntry(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'log-1',
    tenantId: 't1',
    entidade: 'member',
    entidadeId: 'member-1',
    acao: 'update',
    usuarioId: 'admin-1',
    ip: '127.0.0.1',
    dispositivo: 'web',
    valorAnterior: { situacao: 'regular' },
    valorNovo: { situacao: 'irregular' },
    timestamp: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildUseCase() {
  const auditLogRepository = new InMemoryAuditLogRepository();
  const useCase = new ListAuditLogUseCase({ auditLogRepository });
  return { useCase, auditLogRepository };
}

describe('ListAuditLogUseCase', () => {
  it('lista apenas as entradas da Loja do contexto, aplicando os filtros', async () => {
    const { useCase, auditLogRepository } = buildUseCase();
    await auditLogRepository.append(buildEntry({ id: 'log-1', entidade: 'member' }));
    await auditLogRepository.append(buildEntry({ id: 'log-2', entidade: 'news' }));
    await auditLogRepository.append(buildEntry({ id: 'log-3', tenantId: 't2' }));

    const result = await useCase.execute(ctx, { entidade: 'member' }, { limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('log-1');
  });

  it('retorna página vazia quando não há entradas para o tenant', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, {}, { limit: 20 });

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it('rejeita quem não tem permissão auditLog:read', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(ctxSemPermissao, {}, { limit: 20 })).rejects.toThrow(
      'Permissão ausente: auditLog:read.',
    );
  });
});
