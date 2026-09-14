import { BOARD_POSITION_KEYS, type BoardPositionKey } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IMemberPositionHistoryRepository } from '../../membership/repositories/member-position-history.repository';
import type { IBoardTermRepository } from '../repositories/board-term.repository';
import { ok, type Result } from '../../../shared/result';

export interface BoardTermCoverageGap {
  gestaoId: string;
  gestaoNome: string;
  cargosFaltando: BoardPositionKey[];
}

export interface DuplicateCargoInTerm {
  gestaoId: string;
  gestaoNome: string;
  cargo: string;
  memberId: string;
  nomeCompleto: string;
  ocorrencias: number;
}

export interface AuditBoardTermCoverageResult {
  totalGestoes: number;
  gestoesSemCargo: BoardTermCoverageGap[];
  cargosDuplicados: DuplicateCargoInTerm[];
}

/**
 * Auditoria só-leitura pedida pelo Administrador: (1) toda Gestão deveria
 * ter Venerável Mestre, 1º e 2º Vigilante registrados — sinaliza quem não
 * tem; (2) um mesmo Irmão não deveria ocupar o mesmo cargo mais de uma vez
 * DENTRO da mesma Gestão (isso é diferente de ocupar o mesmo cargo em
 * Gestões diferentes ao longo dos anos, que é normal/esperado, ou de duas
 * pessoas diferentes se revezando no mesmo cargo por afastamento — só sinaliza
 * quando o memberId+cargo+gestaoId se repete). Duplicados com a mesma
 * `dataInicio` exata (efeito colateral de reimportação parcial) já são
 * limpos por `DedupeMemberPositionHistoryUseCase` — esta auditoria pega o
 * que sobra: o mesmo vínculo lançado mais de uma vez com datas diferentes.
 */
export class AuditBoardTermCoverageUseCase {
  constructor(
    private readonly deps: {
      boardTermRepository: IBoardTermRepository;
      positionHistoryRepository: IMemberPositionHistoryRepository;
      memberRepository: IMemberRepository;
    },
  ) {}

  async execute(ctx: AuthContext): Promise<Result<AuditBoardTermCoverageResult>> {
    requirePermission(ctx, 'boardTerm:manage');

    const [terms, allHistory] = await Promise.all([
      this.deps.boardTermRepository.listByTenant(ctx.tenantId),
      this.deps.positionHistoryRepository.listByTenant(ctx.tenantId),
    ]);

    const historyByGestao = new Map<string, typeof allHistory>();
    for (const entry of allHistory) {
      const list = historyByGestao.get(entry.gestaoId) ?? [];
      list.push(entry);
      historyByGestao.set(entry.gestaoId, list);
    }

    const gestoesSemCargo: BoardTermCoverageGap[] = [];
    for (const term of terms) {
      const entries = historyByGestao.get(term.id) ?? [];
      const cargosPresentes = new Set(entries.map((e) => e.cargo));
      const cargosFaltando = BOARD_POSITION_KEYS.filter((cargo) => !cargosPresentes.has(cargo));
      if (cargosFaltando.length > 0) {
        gestoesSemCargo.push({ gestaoId: term.id, gestaoNome: term.nome, cargosFaltando });
      }
    }

    const groups = new Map<string, typeof allHistory>();
    for (const entry of allHistory) {
      const key = `${entry.memberId}|${entry.cargo}|${entry.gestaoId}`;
      const list = groups.get(key) ?? [];
      list.push(entry);
      groups.set(key, list);
    }

    const termNameById = new Map(terms.map((t) => [t.id, t.nome]));
    const duplicateGroups = [...groups.entries()].filter(([, entries]) => entries.length > 1);

    const memberIds = [...new Set(duplicateGroups.map(([, entries]) => entries[0]!.memberId))];
    const members = await Promise.all(
      memberIds.map((id) => this.deps.memberRepository.findById(id)),
    );
    const memberNameById = new Map(
      members
        .filter((m): m is NonNullable<typeof m> => m !== null)
        .map((m) => [m.id, m.nomeCompleto]),
    );

    const cargosDuplicados: DuplicateCargoInTerm[] = duplicateGroups.map(([, entries]) => {
      const first = entries[0]!;
      return {
        gestaoId: first.gestaoId,
        gestaoNome: termNameById.get(first.gestaoId) ?? 'Gestão não encontrada',
        cargo: first.cargo,
        memberId: first.memberId,
        nomeCompleto: memberNameById.get(first.memberId) ?? 'Irmão não encontrado',
        ocorrencias: entries.length,
      };
    });

    return ok({
      totalGestoes: terms.length,
      gestoesSemCargo,
      cargosDuplicados,
    });
  }
}
