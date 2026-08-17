import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository } from '../repositories/member.repository';

export interface UpdateMyPhotoDeps {
  memberRepository: IMemberRepository;
  clock: IClock;
}

/**
 * Autoatendimento — o Irmão troca a própria foto de perfil. Mesmo critério
 * de posse do `UpdateMyProfileUseCase` (não usa `requirePermission`), mas
 * isolado num Use Case dedicado em vez de estender `memberSelfEditSchema`:
 * `fotoUrl` exige upload/validação de arquivo antes de virar uma URL, então
 * não cabe no formato "campo de formulário" dos demais campos de
 * autoatendimento.
 */
export class UpdateMyPhotoUseCase {
  constructor(private readonly deps: UpdateMyPhotoDeps) {}

  async execute(ctx: AuthContext, fotoUrl: string): Promise<Result<Member>> {
    const current = await this.deps.memberRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!current) {
      return err(new NotFoundError('Member', ctx.uid));
    }
    if (current.userId !== ctx.uid) {
      return err(new ForbiddenError('member:update'));
    }

    const updated: Member = {
      ...current,
      fotoUrl,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.memberRepository.update(updated);

    return ok(updated);
  }
}
