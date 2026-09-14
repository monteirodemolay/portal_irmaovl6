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
 * Considera a data de fim MAIS ANTIGA em que o Irmão deixou o cargo (a
 * primeira vez que virou Mestre Instalado, mesmo que tenha voltado a ser
 * Venerável depois). Seguro rodar quantas vezes for preciso — idempotente
 * por Irmão.
 */
export class BackfillMestreInstaladoTitlesUseCase {
  constructor(private readonly deps: BackfillMestreInstaladoTitlesDeps) {}

  async execute(ctx: AuthContext): Promise<Result<BackfillMestreInstaladoTitlesResult>> {
    requirePermission(ctx, 'boardTerm:manage');

    const allHistory = await this.deps.positionHistoryRepository.listByTenant(ctx.tenantId);
    const pastVeneraveis = allHistory.filter(
      (entry) => entry.cargo === 'veneravel_mestre' && entry.dataFim !== null,
    );

    const earliestEndByMember = new Map<string, Date>();
    for (const entry of pastVeneraveis) {
      const current = earliestEndByMember.get(entry.memberId);
      if (!current || entry.dataFim!.getTime() < current.getTime()) {
        earliestEndByMember.set(entry.memberId, entry.dataFim!);
      }
    }

    const membrosConcedidos: Array<{ memberId: string; nomeCompleto: string }> = [];
    for (const [memberId, dataFim] of earliestEndByMember) {
      const existingTitles = await this.deps.memberTitleRepository.listByMemberId(
        ctx.tenantId,
        memberId,
      );
      if (existingTitles.some((title) => title.titulo === 'mestre_instalado')) continue;

      const member = await this.deps.memberRepository.findById(memberId);
      if (!member) continue;

      await grantMestreInstaladoTitleIfNeeded(this.deps, {
        tenantId: ctx.tenantId,
        memberId,
        dataFimCargo: dataFim,
        uid: ctx.uid,
        fundamento: 'Concedido automaticamente por ter exercido o cargo de Venerável Mestre.',
      });
      membrosConcedidos.push({ memberId, nomeCompleto: member.nomeCompleto });
    }

    return ok({
      totalExVeneraveis: earliestEndByMember.size,
      titulosConcedidos: membrosConcedidos.length,
      membrosConcedidos,
    });
  }
}
