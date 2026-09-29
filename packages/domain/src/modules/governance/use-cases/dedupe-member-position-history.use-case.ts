import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { MemberPositionHistory } from '../../membership/entities/member-position-history.entity';
import type { IMemberPositionHistoryRepository } from '../../membership/repositories/member-position-history.repository';
import type { IBoardTermRepository } from '../repositories/board-term.repository';

export interface DedupeMemberPositionHistoryDeps {
  positionHistoryRepository: IMemberPositionHistoryRepository;
  boardTermRepository: IBoardTermRepository;
  clock: IClock;
}

export interface DedupeMemberPositionHistoryResult {
  totalRegistros: number;
  gruposDuplicados: number;
  registrosRemovidos: number;
  /** Grupos com mesmo Irmão+cargo+Gestão mas datas de início diferentes, mesclados num único registro contínuo (ver `AuditBoardTermCoverageUseCase.cargosDuplicados`). */
  gruposMesclados: number;
}

/**
 * Limpeza dos registros de `MemberPositionHistory` duplicados. Dois casos
 * distintos, tratados em duas passadas:
 *
 * 1. Mesmo vínculo (mesmo Irmão, mesmo cargo, mesma Gestão, MESMA data de
 *    início) gravado mais de uma vez — efeito colateral de reimportações
 *    da nominata histórica que expiravam no meio do caminho antes desta
 *    ficar idempotente. Mantém o registro criado primeiro, apaga o resto.
 * 2. Mesmo vínculo com datas de início DIFERENTES — `AssignBoardPositionUseCase`
 *    reatribuindo o mesmo Irmão ao mesmo cargo/Gestão sem que o titular
 *    tivesse de fato mudado (reenvio do formulário, correção de `ordem`
 *    etc.) fragmentava o período real em dois pedaços, exibidos como
 *    "Venerável Mestre" (ou outro cargo) duplicado no Perfil do Irmão.
 *    Mescla num único registro contínuo alinhado ao período da própria
 *    Gestão (`BoardTerm.periodoInicio`/`periodoFim`) — um Irmão é titular
 *    de um cargo durante toda a Gestão em que está inserido, nunca só a
 *    partir do dia em que o Administrador registrou isso no Portal. Fica
 *    "em curso" (`dataFim: null`) enquanto a Gestão não tiver terminado;
 *    quando a Gestão não é encontrada (excluída), cai pro comportamento
 *    anterior — mantém a data de início mais antiga entre os pedaços e a
 *    data de fim mais recente, sem nunca perder um "em curso".
 *
 * Seguro rodar de novo: sem duplicados, não muda nada.
 */
export class DedupeMemberPositionHistoryUseCase {
  constructor(private readonly deps: DedupeMemberPositionHistoryDeps) {}

  async execute(ctx: AuthContext): Promise<Result<DedupeMemberPositionHistoryResult>> {
    requirePermission(ctx, 'boardTerm:manage');

    const allHistory = await this.deps.positionHistoryRepository.listByTenant(ctx.tenantId);

    const exactGroups = new Map<string, typeof allHistory>();
    for (const entry of allHistory) {
      const key = `${entry.memberId}|${entry.cargo}|${entry.gestaoId}|${entry.dataInicio.toISOString()}`;
      const list = exactGroups.get(key) ?? [];
      list.push(entry);
      exactGroups.set(key, list);
    }

    const idsToDelete: string[] = [];
    const removedIds = new Set<string>();
    let gruposDuplicados = 0;
    for (const entries of exactGroups.values()) {
      if (entries.length <= 1) continue;
      gruposDuplicados += 1;
      const ordered = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const [, ...duplicates] = ordered;
      for (const duplicate of duplicates) {
        idsToDelete.push(duplicate.id);
        removedIds.add(duplicate.id);
      }
    }

    // Segunda passada: agrupa pelo mesmo vínculo SEM a data de início, só
    // com o que sobrou da primeira passada — mescla os pedaços de data
    // diferente num só.
    const linkGroups = new Map<string, MemberPositionHistory[]>();
    for (const entry of allHistory) {
      if (removedIds.has(entry.id)) continue;
      const key = `${entry.memberId}|${entry.cargo}|${entry.gestaoId}`;
      const list = linkGroups.get(key) ?? [];
      list.push(entry);
      linkGroups.set(key, list);
    }

    const groupsToMerge = [...linkGroups.values()].filter((entries) => entries.length > 1);
    const termIds = new Set(groupsToMerge.map((entries) => entries[0]!.gestaoId));
    const terms = await Promise.all(
      [...termIds].map((id) => this.deps.boardTermRepository.findById(id)),
    );
    const termById = new Map(
      terms.filter((t): t is NonNullable<typeof t> => t !== null).map((t) => [t.id, t]),
    );
    const now = this.deps.clock.now();

    let gruposMesclados = 0;
    const updates: MemberPositionHistory[] = [];
    for (const entries of groupsToMerge) {
      gruposMesclados += 1;
      const ordered = [...entries].sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime());
      const [canonical, ...extras] = ordered;
      const term = termById.get(canonical!.gestaoId);
      const aindaEmCurso = ordered.some((e) => e.dataFim === null);

      const dataInicio = term ? term.periodoInicio : canonical!.dataInicio;
      const dataFim = term
        ? term.periodoFim <= now
          ? term.periodoFim
          : null
        : aindaEmCurso
          ? null
          : ordered.reduce<Date | null>((latest, e) => {
              if (!e.dataFim) return latest;
              return !latest || e.dataFim.getTime() > latest.getTime() ? e.dataFim : latest;
            }, null);

      updates.push({ ...canonical!, dataInicio, dataFim });
      for (const extra of extras) {
        idsToDelete.push(extra.id);
      }
    }

    await Promise.all([
      ...idsToDelete.map((id) => this.deps.positionHistoryRepository.delete(id)),
      ...updates.map((entry) => this.deps.positionHistoryRepository.update(entry)),
    ]);

    return ok({
      totalRegistros: allHistory.length,
      gruposDuplicados,
      registrosRemovidos: idsToDelete.length,
      gruposMesclados,
    });
  }
}
