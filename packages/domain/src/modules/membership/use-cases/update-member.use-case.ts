import type { MemberFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ConflictError, ok, err, type Result } from '../../../shared/result';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository } from '../repositories/member.repository';

export interface UpdateMemberDeps {
  memberRepository: IMemberRepository;
  clock: IClock;
}

/** Edição administrativa completa do cadastro — requer `member:update`. */
export class UpdateMemberUseCase {
  constructor(private readonly deps: UpdateMemberDeps) {}

  async execute(
    ctx: AuthContext,
    memberId: string,
    input: MemberFormValues,
  ): Promise<Result<Member>> {
    requirePermission(ctx, 'member:update');

    const current = await this.deps.memberRepository.findById(memberId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Member', memberId));
    }

    if (input.cim && input.cim !== current.cim) {
      const taken = await this.deps.memberRepository.existsByCim(ctx.tenantId, input.cim);
      if (taken) {
        return err(new ConflictError(`CIM "${input.cim}" já está em uso.`));
      }
    }

    const updated: Member = {
      ...current,
      ...input,
      redesSociais: {
        instagram: input.redesSociais.instagram ?? null,
        facebook: input.redesSociais.facebook ?? null,
        linkedin: input.redesSociais.linkedin ?? null,
      },
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.memberRepository.update(updated);

    return ok(updated);
  }
}
