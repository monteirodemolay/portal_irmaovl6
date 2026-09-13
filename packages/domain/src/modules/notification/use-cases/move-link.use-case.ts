import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { ILinkRepository } from '../repositories/link.repository';

export interface MoveLinkDeps {
  linkRepository: ILinkRepository;
  clock: IClock;
}

/**
 * Reordena um Link um passo pra cima/baixo — troca `ordem` com o vizinho
 * imediato na lista completa do tenant (`listAll`, já ordenada por
 * `ordem`). Sem lista arrastar-e-soltar: dois botões (▲▼) resolvem o mesmo
 * problema com bem menos código no client, e a Área do Irmão raramente tem
 * mais do que uma ou duas dezenas de Links pra justificar drag-and-drop.
 */
export class MoveLinkUseCase {
  constructor(private readonly deps: MoveLinkDeps) {}

  async execute(ctx: AuthContext, linkId: string, direction: 'up' | 'down'): Promise<Result<void>> {
    requirePermission(ctx, 'link:update');

    const ordered = await this.deps.linkRepository.listAll(ctx.tenantId);
    const index = ordered.findIndex((link) => link.id === linkId);
    if (index === -1) {
      return err(new NotFoundError('Link', linkId));
    }

    const neighborIndex = direction === 'up' ? index - 1 : index + 1;
    if (neighborIndex < 0 || neighborIndex >= ordered.length) {
      return ok(undefined);
    }

    const current = ordered[index]!;
    const neighbor = ordered[neighborIndex]!;
    const now = this.deps.clock.now();

    await Promise.all([
      this.deps.linkRepository.update({
        ...current,
        ordem: neighbor.ordem,
        updatedAt: now,
        updatedBy: ctx.uid,
      }),
      this.deps.linkRepository.update({
        ...neighbor,
        ordem: current.ordem,
        updatedAt: now,
        updatedBy: ctx.uid,
      }),
    ]);

    return ok(undefined);
  }
}
