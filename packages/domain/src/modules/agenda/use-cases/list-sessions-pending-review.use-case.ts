import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { Event } from '../entities/event.entity';
import type { IEventRepository } from '../repositories/event.repository';

export interface ListSessionsPendingReviewDeps {
  eventRepository: IEventRepository;
}

/** Teto de leitura por chamada — mesmo raciocínio de `SeedSessionClassificationUseCase`. */
const SCAN_LIMIT = 5000;

/**
 * Painel dedicado de revisão em lote (`classificationReviewRequired`) —
 * antes só dava pra achar essas Sessões reabrindo cada uma na edição
 * normal. Lista só quem precisa de atenção, sem paginar por cursor (volume
 * baixo — revisão administrativa pontual, não uma listagem de rotina).
 */
export class ListSessionsPendingReviewUseCase {
  constructor(private readonly deps: ListSessionsPendingReviewDeps) {}

  async execute(ctx: AuthContext): Promise<Event[]> {
    requirePermission(ctx, 'event:manage');

    const { items } = await this.deps.eventRepository.listAll(ctx.tenantId, {
      limit: SCAN_LIMIT,
    });

    return items
      .filter((event) => event.tipo === 'sessao' && event.classificationReviewRequired)
      .sort((a, b) => b.dataInicio.getTime() - a.dataInicio.getTime());
  }
}
