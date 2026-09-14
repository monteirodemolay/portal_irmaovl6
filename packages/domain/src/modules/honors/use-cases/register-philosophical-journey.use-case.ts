import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { err, ValidationError, ok, type Result } from '../../../shared/result';
import type { PhilosophicalJourney } from '../entities/philosophical-journey.entity';
import type { IPhilosophicalJourneyRepository } from '../repositories/philosophical-journey.repository';

export interface RegisterPhilosophicalJourneyInput {
  memberId: string;
  rito: string;
  corpoMaconico: string | null;
  grau: string | null;
  instituicao: string | null;
  data: Date | null;
  funcoesExercidas: string | null;
  visivel: boolean;
}

export interface RegisterPhilosophicalJourneyDeps {
  philosophicalJourneyRepository: IPhilosophicalJourneyRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cadastro de um Grau Filosófico/Corpo Maçônico (Fase 3 do domínio de
 * Honrarias) — ver `PhilosophicalJourney`. `visivel` nasce como o
 * Administrador decidiu no formulário (default `false` na UI, nunca aqui —
 * o Use Case só grava o que veio).
 */
export class RegisterPhilosophicalJourneyUseCase {
  constructor(private readonly deps: RegisterPhilosophicalJourneyDeps) {}

  async execute(
    ctx: AuthContext,
    input: RegisterPhilosophicalJourneyInput,
  ): Promise<Result<PhilosophicalJourney>> {
    requirePermission(ctx, 'honor:manage');

    if (!input.rito.trim()) {
      return err(new ValidationError('Rito é obrigatório.'));
    }

    const now = this.deps.clock.now();
    const journey: PhilosophicalJourney = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      memberId: input.memberId,
      rito: input.rito.trim(),
      corpoMaconico: input.corpoMaconico,
      grau: input.grau,
      instituicao: input.instituicao,
      data: input.data,
      funcoesExercidas: input.funcoesExercidas,
      visivel: input.visivel,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.philosophicalJourneyRepository.create(journey);

    return ok(journey);
  }
}
