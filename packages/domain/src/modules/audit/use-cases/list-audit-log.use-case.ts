import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { AuditLog } from '../entities/audit-log.entity';
import type { IAuditLogRepository } from '../repositories/audit-log.repository';

export interface ListAuditLogDeps {
  auditLogRepository: IAuditLogRepository;
}

export interface ListAuditLogInput {
  entidade?: string;
  entidadeId?: string;
}

/** Trilha de auditoria — requer `auditLog:read` (Painel Administrativo). */
export class ListAuditLogUseCase {
  constructor(private readonly deps: ListAuditLogDeps) {}

  async execute(
    ctx: AuthContext,
    filters: ListAuditLogInput,
    page: PageRequest,
  ): Promise<PageResult<AuditLog>> {
    requirePermission(ctx, 'auditLog:read');
    return this.deps.auditLogRepository.search({ ...filters, tenantId: ctx.tenantId }, page);
  }
}
