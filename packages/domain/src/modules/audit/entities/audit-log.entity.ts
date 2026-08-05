export type AuditAction =
  'create' | 'update' | 'delete' | 'restore' | 'login' | 'permission_change';

/**
 * Registro de auditoria — imutável e append-only, por isso NÃO estende
 * `BaseEntity` (sem soft delete, sem `updatedAt/updatedBy`: nunca se altera
 * depois de gravado). Ver docs/architecture/03-modelo-dados.md §3.2 e
 * docs/architecture/06-regras-negocio.md §6.7.
 */
export interface AuditLog {
  id: string;
  tenantId: string;
  entidade: string;
  entidadeId: string;
  acao: AuditAction;
  usuarioId: string;
  ip: string | null;
  dispositivo: string | null;
  valorAnterior: unknown;
  valorNovo: unknown;
  timestamp: Date;
}
