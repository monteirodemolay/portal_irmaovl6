import type { ArtTemplateType } from '@vl6/shared';
import type { ArtTemplate } from '../entities/art-template.entity';

export interface IArtTemplateRepository {
  findById(id: string): Promise<ArtTemplate | null>;
  listAll(tenantId: string): Promise<ArtTemplate[]>;
  listActiveByType(tenantId: string, type: ArtTemplateType): Promise<ArtTemplate[]>;
  create(template: ArtTemplate): Promise<void>;
  update(template: ArtTemplate): Promise<void>;
}
