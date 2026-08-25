import type { PublicationStatus } from '@vl6/shared';
import type { Publication } from '../entities/publication.entity';

export interface IPublicationRepository {
  findById(id: string): Promise<Publication | null>;
  /** `null` em `statuses` retorna todas as não excluídas — usado pela busca da fila. */
  listByStatus(tenantId: string, statuses: PublicationStatus[] | null): Promise<Publication[]>;
  /** Idempotência de geração automática — evita criar duas publicações pro mesmo Evento/Irmão no mesmo dia. */
  findBySource(
    tenantId: string,
    sourceType: Publication['sourceType'],
    sourceId: string,
    scheduledForDay: string,
  ): Promise<Publication | null>;
  create(publication: Publication): Promise<void>;
  update(publication: Publication): Promise<void>;
}
