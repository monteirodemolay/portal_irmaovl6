import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type {
  ConstellationView,
  ConstellationViewFilters,
  ConstellationViewVisibility,
} from '../entities/constellation-view.entity';
import type { IConstellationViewRepository } from '../repositories/constellation-view.repository';
import type { IConstellationViewRevisionRepository } from '../repositories/constellation-view-revision.repository';

export interface CreateConstellationViewDeps {
  constellationViewRepository: IConstellationViewRepository;
  constellationViewRevisionRepository: IConstellationViewRevisionRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface CreateConstellationViewInput {
  nome: string;
  descricao: string | null;
  centerNodeKey: string | null;
  filters: ConstellationViewFilters;
  pinnedNodeKeys: string[];
  hiddenNodeKeys: string[];
  visibility: ConstellationViewVisibility;
}

/** "Salvar meu quadro" — primeira versão de um quadro pessoal da Constelação da Memória. */
export class CreateConstellationViewUseCase {
  constructor(private readonly deps: CreateConstellationViewDeps) {}

  async execute(
    ctx: AuthContext,
    input: CreateConstellationViewInput,
  ): Promise<Result<ConstellationView>> {
    requirePermission(ctx, 'archiveRelation:read');

    const now = this.deps.clock.now();
    const view: ConstellationView = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ownerId: ctx.uid,
      nome: input.nome,
      descricao: input.descricao,
      centerNodeKey: input.centerNodeKey,
      filters: input.filters,
      pinnedNodeKeys: input.pinnedNodeKeys,
      hiddenNodeKeys: input.hiddenNodeKeys,
      visibility: input.visibility,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.constellationViewRepository.create(view);
    await this.deps.constellationViewRevisionRepository.create({
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      viewId: view.id,
      version: view.version,
      nome: view.nome,
      descricao: view.descricao,
      centerNodeKey: view.centerNodeKey,
      filters: view.filters,
      pinnedNodeKeys: view.pinnedNodeKeys,
      hiddenNodeKeys: view.hiddenNodeKeys,
      createdAt: now,
      createdBy: ctx.uid,
    });

    return ok(view);
  }
}
