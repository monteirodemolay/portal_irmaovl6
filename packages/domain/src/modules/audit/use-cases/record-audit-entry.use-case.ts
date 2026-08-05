import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { AuditAction, AuditLog } from '../entities/audit-log.entity';
import type { IAuditLogRepository } from '../repositories/audit-log.repository';

export interface RecordAuditEntryInput {
  tenantId: string;
  entidade: string;
  entidadeId: string;
  acao: AuditAction;
  usuarioId: string;
  ip: string | null;
  dispositivo: string | null;
  valorAnterior: unknown;
  valorNovo: unknown;
}

export interface RecordAuditEntryDeps {
  auditLogRepository: IAuditLogRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Grava uma entrada de auditoria. Sem `AuthContext`/checagem de permissão
 * de propósito: só é chamado por infraestrutura de confiança (Cloud
 * Function trigger com Admin SDK) — nunca por uma requisição de usuário
 * diretamente, o que já é reforçado pela Security Rule de `auditLogs`
 * (`allow write: if false`). Ver docs/architecture/06 §6.7.
 */
export class RecordAuditEntryUseCase {
  constructor(private readonly deps: RecordAuditEntryDeps) {}

  async execute(input: RecordAuditEntryInput): Promise<AuditLog> {
    const entry: AuditLog = {
      id: this.deps.idGenerator.next(),
      ...input,
      timestamp: this.deps.clock.now(),
    };
    await this.deps.auditLogRepository.append(entry);
    return entry;
  }
}
