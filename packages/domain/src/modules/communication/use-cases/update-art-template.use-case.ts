import type { PublicationOutputFormat } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { ArtTemplate, TemplateField } from '../entities/art-template.entity';
import type { IArtTemplateRepository } from '../repositories/art-template.repository';

export interface UpdateArtTemplateInput {
  name: string;
  outputFormats: PublicationOutputFormat[];
  fields: TemplateField[];
  active: boolean;
}

export interface UpdateArtTemplateDeps {
  artTemplateRepository: IArtTemplateRepository;
  clock: IClock;
}

/**
 * Reposicionar campos (drag no editor visual), renomear, trocar formatos de
 * saída ou ativar/desativar — nunca troca a imagem de fundo nem o `type`
 * (isso é um modelo novo, não uma edição). Incrementa `version` a cada
 * salvamento: publicações já geradas guardam o resultado final, não
 * recalculam texto sobre um modelo que mudou de posição depois.
 */
export class UpdateArtTemplateUseCase {
  constructor(private readonly deps: UpdateArtTemplateDeps) {}

  async execute(
    ctx: AuthContext,
    templateId: string,
    input: UpdateArtTemplateInput,
  ): Promise<Result<ArtTemplate>> {
    requirePermission(ctx, 'communication:manage');

    const current = await this.deps.artTemplateRepository.findById(templateId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArtTemplate', templateId));
    }

    const updated: ArtTemplate = {
      ...current,
      ...input,
      version: current.version + 1,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.artTemplateRepository.update(updated);

    return ok(updated);
  }
}
