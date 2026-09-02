import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type {
  ConstellationView,
  ConstellationViewFilters,
  ConstellationViewVisibility,
} from '../entities/constellation-view.entity';
import type { IConstellationViewRepository } from '../repositories/constellation-view.repository';
import type { IConstellationViewRevisionRepository } from '../repositories/constellation-view-revision.repository';

export interface UpdateConstellationViewDeps {
  constellationViewRepository: IConstellationViewRepository;
  constellationViewRevisionRepository: IConstellationViewRevisionRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface UpdateConstellationViewInput {
  nome: string;
  descricao: string | null;
  centerNodeKey: string | null;
  filters: ConstellationViewFilters;
  pinnedNodeKeys: string[];
  hiddenNodeKeys: string[];
  visibility: ConstellationViewVisibility;
}

/**
 * Atualiza um quadro já salvo — só o dono pode. Sempre incrementa
 * `version` e grava uma nova `ConstellationViewRevision` (histórico de
 * versões pra restaurar/auditar, item do pacote de implantação), nunca
 * sobrescreve a revisão anterior.
 */
export class UpdateConstellationViewUseCase {
  constructor(private readonly deps: UpdateConstellationViewDeps) {}

  async execute(
    ctx: AuthContext,
    viewId: string,
    input: UpdateConstellationViewInput,
  ): Promise<Result<ConstellationView>> {
    requirePermission(ctx, 'archiveRelation:read');

    const current = await this.deps.constellationViewRepository.findById(viewId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ConstellationView', viewId));
    }
    if (current.ownerId !== ctx.uid) {
      return err(new ForbiddenError('dono do quadro'));
    }

    const now = this.deps.clock.now();
    const updated: ConstellationView = {
      ...current,
      nome: input.nome,
      descricao: input.descricao,
      centerNodeKey: input.centerNodeKey,
      filters: input.filters,
      pinnedNodeKeys: input.pinnedNodeKeys,
      hiddenNodeKeys: input.hiddenNodeKeys,
      visibility: input.visibility,
      version: current.version + 1,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.constellationViewRepository.update(updated);
    await this.deps.constellationViewRevisionRepository.create({
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      viewId: updated.id,
      version: updated.version,
      nome: updated.nome,
      descricao: updated.descricao,
      centerNodeKey: updated.centerNodeKey,
      filters: updated.filters,
      pinnedNodeKeys: updated.pinnedNodeKeys,
      hiddenNodeKeys: updated.hiddenNodeKeys,
      createdAt: now,
      createdBy: ctx.uid,
    });

    return ok(updated);
  }
}
