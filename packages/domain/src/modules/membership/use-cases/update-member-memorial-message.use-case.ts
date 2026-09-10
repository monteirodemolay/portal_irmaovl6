import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ValidationError, ok, err, type Result } from '../../../shared/result';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository } from '../repositories/member.repository';

export interface UpdateMemberMemorialMessageDeps {
  memberRepository: IMemberRepository;
  clock: IClock;
}

/**
 * Mensagem de homenagem exibida na página In Memoriam do perfil público —
 * único campo desta ação, separado da edição administrativa geral
 * (`UpdateMemberUseCase`) porque só faz sentido quando `situacao ===
 * 'falecido'`, e só existe depois disso (mesma divisão de
 * `UpdateMyPhotoUseCase`: campo estreito o bastante pra não caber no
 * formulário geral). Requer `member:update`, igual ao resto da edição
 * administrativa.
 */
export class UpdateMemberMemorialMessageUseCase {
  constructor(private readonly deps: UpdateMemberMemorialMessageDeps) {}

  async execute(
    ctx: AuthContext,
    memberId: string,
    mensagemHomenagem: string | null,
  ): Promise<Result<Member>> {
    requirePermission(ctx, 'member:update');

    const current = await this.deps.memberRepository.findById(memberId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Member', memberId));
    }
    if (current.situacao !== 'falecido') {
      return err(
        new ValidationError('Só é possível registrar mensagem de homenagem para In Memoriam.'),
      );
    }

    const updated: Member = {
      ...current,
      mensagemHomenagem,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.memberRepository.update(updated);

    return ok(updated);
  }
}
