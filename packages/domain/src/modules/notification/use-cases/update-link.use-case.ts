import type { LinkAccessTypeKey, LinkCategoryKey } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { Link } from '../entities/link.entity';
import type { ILinkRepository } from '../repositories/link.repository';

export interface UpdateLinkInput {
  titulo: string;
  url: string;
  descricao: string | null;
  icone: string | null;
  categoria: LinkCategoryKey;
  tipoAcesso: LinkAccessTypeKey;
  destaque: boolean;
  ordem: number;
}

export interface UpdateLinkDeps {
  linkRepository: ILinkRepository;
  clock: IClock;
}

export class UpdateLinkUseCase {
  constructor(private readonly deps: UpdateLinkDeps) {}

  async execute(ctx: AuthContext, linkId: string, input: UpdateLinkInput): Promise<Result<Link>> {
    requirePermission(ctx, 'link:update');

    const link = await this.deps.linkRepository.findById(linkId);
    if (!link || link.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Link', linkId));
    }

    const updated: Link = {
      ...link,
      ...input,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.linkRepository.update(updated);

    return ok(updated);
  }
}
