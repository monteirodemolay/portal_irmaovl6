import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IMemberPositionHistoryRepository } from '../../membership/repositories/member-position-history.repository';
import type { IMemberTitleRepository } from '../../honors/repositories/member-title.repository';
import { grantMestreInstaladoTitleIfNeeded } from '../../honors/lib/grant-mestre-instalado-title';

export interface BackfillMestreInstaladoTitlesDeps {
  positionHistoryRepository: IMemberPositionHistoryRepository;
  memberRepository: IMemberRepository;
  memberTitleRepository: IMemberTitleRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface BackfillMestreInstaladoTitlesResult {
  totalExVeneraveis: number;
  titulosConcedidos: number;
  membrosConcedidos: Array<{ memberId: string; nomeCompleto: string }>;
}

/**
 * Concede o título de Mestre Instalado, retroativamente, a todo Irmão que
 * já exerceu o cargo de Venerável Mestre e deixou o cargo antes dessa regra
 * existir no sistema (`grantMestreInstaladoTitleIfNeeded`, chamado
 * automaticamente dali em diante em `AssignBoardPositionUseCase`,
 * `RegisterMemberSituationUseCase` e `ImportHistoricalBoardTermsUseCase`).
 * Um Irmão que exerceu o cargo em mais de uma gestão recebe um título por
 * gestão concluída (cada mandato como Venerável Mestre vira um Mestre
 * Instalado próprio) — por isso este backfill percorre TODO o histórico de
 * mandatos como Venerável Mestre com data de fim, não só o mais antigo por
 * Irmão. Seguro rodar quantas vezes for preciso: a idempotência por gestão
 * (mesma data de concessão) é garantida dentro de
 * `grantMestreInstaladoTitleIfNeeded`.
 */
export class BackfillMestreInstaladoTitlesUseCase {
  constructor(private readonly deps: BackfillMestreInstaladoTitlesDeps) {}

  async execute(ctx: AuthContext): Promise<Result<BackfillMestreInstaladoTitlesResult>> {
    requirePermission(ctx, 'boardTerm:manage');

    const allHistory = await this.deps.positionHistoryRepository.listByTenant(ctx.tenantId);
    const pastVeneraveis = allHistory.filter(
      (entry) => entry.cargo === 'veneravel_mestre' && entry.dataFim !== null,
    );

    const memberNameCache = new Map<string, string | null>();
    const membrosConcedidos: Array<{ memberId: string; nomeCompleto: string }> = [];

    for (const entry of pastVeneraveis) {
      if (!memberNameCache.has(entry.memberId)) {
        const member = await this.deps.memberRepository.findById(entry.memberId);
        memberNameCache.set(entry.memberId, member?.nomeCompleto ?? null);
      }
      const nomeCompleto = memberNameCache.get(entry.memberId);
      if (!nomeCompleto) continue;

      const granted = await grantMestreInstaladoTitleIfNeeded(this.deps, {
        tenantId: ctx.tenantId,
        memberId: entry.memberId,
        dataFimCargo: entry.dataFim!,
        uid: ctx.uid,
        fundamento: 'Concedido automaticamente por ter exercido o cargo de Venerável Mestre.',
      });
      if (granted) {
        membrosConcedidos.push({ memberId: entry.memberId, nomeCompleto });
      }
    }

    return ok({
      totalExVeneraveis: new Set(pastVeneraveis.map((entry) => entry.memberId)).size,
      titulosConcedidos: membrosConcedidos.length,
      membrosConcedidos,
    });
  }
}
