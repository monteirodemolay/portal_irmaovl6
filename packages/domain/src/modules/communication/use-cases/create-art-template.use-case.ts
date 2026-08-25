import type { ArtTemplateType, PublicationOutputFormat } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { ArtTemplate, TemplateField } from '../entities/art-template.entity';
import type { IArtTemplateRepository } from '../repositories/art-template.repository';

export interface CreateArtTemplateInput {
  name: string;
  type: ArtTemplateType;
  backgroundUrl: string;
  backgroundWidth: number;
  backgroundHeight: number;
  outputFormats: PublicationOutputFormat[];
  fields: TemplateField[];
}

export interface CreateArtTemplateDeps {
  artTemplateRepository: IArtTemplateRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/** Cadastro do modelo — a imagem de fundo é enviada uma vez e nunca reprocessada aqui. */
export class CreateArtTemplateUseCase {
  constructor(private readonly deps: CreateArtTemplateDeps) {}

  async execute(ctx: AuthContext, input: CreateArtTemplateInput): Promise<Result<ArtTemplate>> {
    requirePermission(ctx, 'communication:manage');

    const now = this.deps.clock.now();
    const template: ArtTemplate = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      version: 1,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.artTemplateRepository.create(template);

    return ok(template);
  }
}
