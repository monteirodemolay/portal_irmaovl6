import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { ConstellationView } from '../entities/constellation-view.entity';
import type { IConstellationViewRepository } from '../repositories/constellation-view.repository';
import type { IConstellationViewRevisionRepository } from '../repositories/constellation-view-revision.repository';

export interface RestoreConstellationViewRevisionDeps {
  constellationViewRepository: IConstellationViewRepository;
  constellationViewRevisionRepository: IConstellationViewRevisionRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Restaura uma versão antiga de um quadro — só o dono. Nunca apaga o
 * histórico: aplicar uma revisão antiga vira uma nova revisão no topo
 * (mesma lógica de "reverter" um documento versionado), preservando a
 * trilha completa de auditoria.
 */
export class RestoreConstellationViewRevisionUseCase {
  constructor(private readonly deps: RestoreConstellationViewRevisionDeps) {}

  async execute(
    ctx: AuthContext,
    viewId: string,
    revisionId: string,
  ): Promise<Result<ConstellationView>> {
    requirePermission(ctx, 'archiveRelation:read');

    const view = await this.deps.constellationViewRepository.findById(viewId);
    if (!view || view.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ConstellationView', viewId));
    }
    if (view.ownerId !== ctx.uid) {
      return err(new ForbiddenError('dono do quadro'));
    }

    const revisions = await this.deps.constellationViewRevisionRepository.listByView(
      ctx.tenantId,
      viewId,
    );
    const revision = revisions.find((r) => r.id === revisionId);
    if (!revision) {
      return err(new NotFoundError('ConstellationViewRevision', revisionId));
    }

    const now = this.deps.clock.now();
    const restored: ConstellationView = {
      ...view,
      nome: revision.nome,
      descricao: revision.descricao,
      centerNodeKey: revision.centerNodeKey,
      filters: revision.filters,
      pinnedNodeKeys: revision.pinnedNodeKeys,
      hiddenNodeKeys: revision.hiddenNodeKeys,
      version: view.version + 1,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.constellationViewRepository.update(restored);
    await this.deps.constellationViewRevisionRepository.create({
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      viewId: restored.id,
      version: restored.version,
      nome: restored.nome,
      descricao: restored.descricao,
      centerNodeKey: restored.centerNodeKey,
      filters: restored.filters,
      pinnedNodeKeys: restored.pinnedNodeKeys,
      hiddenNodeKeys: restored.hiddenNodeKeys,
      createdAt: now,
      createdBy: ctx.uid,
    });

    return ok(restored);
  }
}
