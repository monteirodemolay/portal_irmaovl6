import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { err, NotFoundError, ok, type Result } from '../../../shared/result';
import type { IPhilosophicalJourneyRepository } from '../repositories/philosophical-journey.repository';

export interface RemovePhilosophicalJourneyDeps {
  philosophicalJourneyRepository: IPhilosophicalJourneyRepository;
  clock: IClock;
}

/** Remove (soft delete) um Grau Filosófico cadastrado por engano — nunca exclusão física. */
export class RemovePhilosophicalJourneyUseCase {
  constructor(private readonly deps: RemovePhilosophicalJourneyDeps) {}

  async execute(ctx: AuthContext, journeyId: string): Promise<Result<null>> {
    requirePermission(ctx, 'honor:manage');

    const journey = await this.deps.philosophicalJourneyRepository.findById(journeyId);
    if (!journey || journey.tenantId !== ctx.tenantId || journey.deletedAt) {
      return err(new NotFoundError('Grau Filosófico', journeyId));
    }

    await this.deps.philosophicalJourneyRepository.softDelete(
      journeyId,
      this.deps.clock.now(),
      ctx.uid,
    );
    return ok(null);
  }
}
