import { TERMINAL_MEMBER_SITUATIONS, type MemberSituation } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository } from '../repositories/member.repository';
import type { IMemberPositionHistoryRepository } from '../repositories/member-position-history.repository';

export interface UpdateMemberSituationDeps {
  memberRepository: IMemberRepository;
  positionHistoryRepository: IMemberPositionHistoryRepository;
  clock: IClock;
}

/**
 * Muda a situação do Irmão (regular/irregular/remido/inativo/falecido/
 * transferido). Quando a nova situação é terminal (falecido/transferido),
 * encerra automaticamente o cargo ativo em `memberPositionHistory` — regra
 * de negócio em docs/architecture/06-regras-negocio.md §6.1.
 */
export class UpdateMemberSituationUseCase {
  constructor(private readonly deps: UpdateMemberSituationDeps) {}

  async execute(
    ctx: AuthContext,
    memberId: string,
    novaSituacao: MemberSituation,
  ): Promise<Result<Member>> {
    requirePermission(ctx, 'member:update');

    const member = await this.deps.memberRepository.findById(memberId);
    if (!member || member.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Member', memberId));
    }

    const now = this.deps.clock.now();

    if (TERMINAL_MEMBER_SITUATIONS.includes(novaSituacao)) {
      const activePosition =
        await this.deps.positionHistoryRepository.findActiveByMemberId(memberId);
      if (activePosition) {
        await this.deps.positionHistoryRepository.update({
          ...activePosition,
          dataFim: now,
          updatedAt: now,
          updatedBy: ctx.uid,
        });
      }
    }

    const updated: Member = {
      ...member,
      situacao: novaSituacao,
      cargoAtualId: TERMINAL_MEMBER_SITUATIONS.includes(novaSituacao) ? null : member.cargoAtualId,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.memberRepository.update(updated);

    return ok(updated);
  }
}
