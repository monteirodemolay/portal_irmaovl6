import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { Link } from '../entities/link.entity';
import type { ILinkRepository } from '../repositories/link.repository';

export interface SetLinkActiveDeps {
  linkRepository: ILinkRepository;
  clock: IClock;
}

/** Ativa/desativa um Link sem excluí-lo — sai da Área do Irmão mas continua na lista administrativa. */
export class SetLinkActiveUseCase {
  constructor(private readonly deps: SetLinkActiveDeps) {}

  async execute(ctx: AuthContext, linkId: string, ativo: boolean): Promise<Result<Link>> {
    requirePermission(ctx, 'link:update');

    const link = await this.deps.linkRepository.findById(linkId);
    if (!link || link.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Link', linkId));
    }

    const updated: Link = {
      ...link,
      ativo,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.linkRepository.update(updated);

    return ok(updated);
  }
}
