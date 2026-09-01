export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'login'
  | 'permission_change'
  // Fluxo de cadastro assistido da Central VL6 (Fase 2, docs/architecture) —
  // eventos nomeados explicitamente pedidos pelo requisito de auditoria,
  // gravados via `RecordAuditEntryUseCase` (mesmo mecanismo, união apenas
  // estendida — não é um log paralelo).
  | 'member_profile_assisted_started'
  | 'member_profile_assisted_updated'
  | 'member_profile_consent_recorded'
  | 'member_profile_blocks_published'
  | 'member_profile_consent_revoked';

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
