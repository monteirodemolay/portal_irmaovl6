import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type { IMemberPositionHistoryRepository } from '../../membership/repositories/member-position-history.repository';

export interface DedupeMemberPositionHistoryDeps {
  positionHistoryRepository: IMemberPositionHistoryRepository;
}

export interface DedupeMemberPositionHistoryResult {
  totalRegistros: number;
  gruposDuplicados: number;
  registrosRemovidos: number;
}

/**
 * Limpeza dos registros de `MemberPositionHistory` duplicados que a
 * importação da nominata histórica gerou em execuções anteriores que
 * expiraram no meio do caminho (o servidor já tinha gravado o histórico,
 * mas a função era encerrada antes de responder — cada nova tentativa
 * recriava tudo de novo, já que a criação de histórico não era
 * idempotente). Um "duplicado" é o mesmo vínculo (mesmo Irmão, mesmo
 * cargo, mesma Gestão, mesma data de início) gravado mais de uma vez;
 * mantém o registro criado primeiro e apaga o resto. Seguro rodar de
 * novo: sem duplicados, não muda nada.
 */
export class DedupeMemberPositionHistoryUseCase {
  constructor(private readonly deps: DedupeMemberPositionHistoryDeps) {}

  async execute(ctx: AuthContext): Promise<Result<DedupeMemberPositionHistoryResult>> {
    requirePermission(ctx, 'boardTerm:manage');

    const allHistory = await this.deps.positionHistoryRepository.listByTenant(ctx.tenantId);

    const groups = new Map<string, typeof allHistory>();
    for (const entry of allHistory) {
      const key = `${entry.memberId}|${entry.cargo}|${entry.gestaoId}|${entry.dataInicio.toISOString()}`;
      const list = groups.get(key) ?? [];
      list.push(entry);
      groups.set(key, list);
    }

    const idsToDelete: string[] = [];
    let gruposDuplicados = 0;
    for (const entries of groups.values()) {
      if (entries.length <= 1) continue;
      gruposDuplicados += 1;
      const ordered = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const [, ...duplicates] = ordered;
      idsToDelete.push(...duplicates.map((d) => d.id));
    }

    await Promise.all(idsToDelete.map((id) => this.deps.positionHistoryRepository.delete(id)));

    return ok({
      totalRegistros: allHistory.length,
      gruposDuplicados,
      registrosRemovidos: idsToDelete.length,
    });
  }
}
