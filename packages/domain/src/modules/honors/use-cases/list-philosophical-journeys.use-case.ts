import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { PhilosophicalJourney } from '../entities/philosophical-journey.entity';
import type { IPhilosophicalJourneyRepository } from '../repositories/philosophical-journey.repository';

export interface ListPhilosophicalJourneysDeps {
  philosophicalJourneyRepository: IPhilosophicalJourneyRepository;
}

/**
 * Lista os Graus Filosóficos/Corpos Maçônicos de um Irmão, mais recente
 * primeiro — devolve TODOS os registros (`visivel` true ou false); quem
 * exibe pro Diretório público filtra por `visivel` na própria tela (mesmo
 * padrão de `PublicationSettings.blocks`), a Administração vê tudo pra
 * poder editar/corrigir.
 */
export class ListPhilosophicalJourneysUseCase {
  constructor(private readonly deps: ListPhilosophicalJourneysDeps) {}

  async execute(ctx: AuthContext, memberId: string): Promise<PhilosophicalJourney[]> {
    requirePermission(ctx, 'honor:read');

    const journeys = await this.deps.philosophicalJourneyRepository.listByMemberId(
      ctx.tenantId,
      memberId,
    );
    return journeys.sort((a, b) => (b.data?.getTime() ?? 0) - (a.data?.getTime() ?? 0));
  }
}
