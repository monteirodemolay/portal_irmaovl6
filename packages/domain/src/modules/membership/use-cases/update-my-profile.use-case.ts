import type { MemberSelfEditValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository } from '../repositories/member.repository';

export interface UpdateMyProfileDeps {
  memberRepository: IMemberRepository;
  clock: IClock;
}

/**
 * Autoatendimento — o Irmão edita apenas o subconjunto de campos definido
 * em `memberSelfEditSchema` (docs/architecture/08 §8.3: "Irmão tem RW sobre
 * seu próprio registro"). Não usa `requirePermission`: o critério é ser o
 * dono do registro, não ter uma permissão de escopo amplo.
 */
export class UpdateMyProfileUseCase {
  constructor(private readonly deps: UpdateMyProfileDeps) {}

  async execute(ctx: AuthContext, input: MemberSelfEditValues): Promise<Result<Member>> {
    const current = await this.deps.memberRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!current) {
      return err(new NotFoundError('Member', ctx.uid));
    }
    if (current.userId !== ctx.uid) {
      return err(new ForbiddenError('member:update'));
    }

    const updated: Member = {
      ...current,
      ...input,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.memberRepository.update(updated);

    return ok(updated);
  }
}
