import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { AuditLog } from '../entities/audit-log.entity';

export interface AuditLogFilters {
  tenantId: string;
  entidade?: string;
  entidadeId?: string;
}

export interface IAuditLogRepository {
  /** Único método de escrita — nunca update/delete (registro imutável). */
  append(entry: AuditLog): Promise<void>;
  search(filters: AuditLogFilters, page: PageRequest): Promise<PageResult<AuditLog>>;
}
