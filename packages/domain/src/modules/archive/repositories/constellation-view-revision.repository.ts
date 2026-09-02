import type { ConstellationViewRevision } from '../entities/constellation-view.entity';

export interface IConstellationViewRevisionRepository {
  create(revision: ConstellationViewRevision): Promise<void>;
  /** Mais nova primeiro — histórico de versões pra restaurar/auditar. */
  listByView(tenantId: string, viewId: string): Promise<ConstellationViewRevision[]>;
}
