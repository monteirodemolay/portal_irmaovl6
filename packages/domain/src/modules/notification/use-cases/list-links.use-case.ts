import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { Link } from '../entities/link.entity';
import type { ILinkRepository } from '../repositories/link.repository';

export interface ListLinksDeps {
  linkRepository: ILinkRepository;
}

/** Área do Irmão — requer `link:read`. */
export class ListActiveLinksUseCase {
  constructor(private readonly deps: ListLinksDeps) {}

  async execute(ctx: AuthContext): Promise<Link[]> {
    requirePermission(ctx, 'link:read');
    return this.deps.linkRepository.listActive(ctx.tenantId);
  }
}

/** Listagem administrativa (inclui inativos) — requer `link:read`. */
export class ListAllLinksUseCase {
  constructor(private readonly deps: ListLinksDeps) {}

  async execute(ctx: AuthContext): Promise<Link[]> {
    requirePermission(ctx, 'link:read');
    return this.deps.linkRepository.listAll(ctx.tenantId);
  }
}
