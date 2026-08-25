import type { PublicationOutputFormat } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Publication, PublicationAsset } from '../entities/publication.entity';
import type { IPublicationRepository } from '../repositories/publication.repository';

export interface GeneratePublicationAssetInput {
  format: PublicationOutputFormat;
  url: string;
  width: number;
  height: number;
  checksum: string;
}

export interface GeneratePublicationAssetDeps {
  publicationRepository: IPublicationRepository;
  clock: IClock;
}

/**
 * Registra uma arte já renderizada e enviada ao Storage — o `<canvas>` que
 * desenha o PNG roda no navegador (mesma abordagem do mockup aprovado),
 * então este Use Case só persiste o resultado, nunca renderiza imagem no
 * servidor (evita dependência de `canvas`/binário nativo em ambiente
 * serverless, mesma cautela já registrada pra `pdfjs-dist`). Reenviar o
 * mesmo formato substitui a versão anterior; a primeira arte gerada tira o
 * rascunho do estado `draft` e o manda pra aprovação humana.
 */
export class GeneratePublicationAssetUseCase {
  constructor(private readonly deps: GeneratePublicationAssetDeps) {}

  async execute(
    ctx: AuthContext,
    publicationId: string,
    input: GeneratePublicationAssetInput,
  ): Promise<Result<Publication>> {
    requirePermission(ctx, 'communication:manage');

    const current = await this.deps.publicationRepository.findById(publicationId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Publication', publicationId));
    }

    const now = this.deps.clock.now();
    const asset: PublicationAsset = {
      format: input.format,
      url: input.url,
      mimeType: 'image/png',
      width: input.width,
      height: input.height,
      checksum: input.checksum,
      generatedAt: now,
    };
    const assets = [...current.assets.filter((a) => a.format !== input.format), asset];

    const updated: Publication = {
      ...current,
      assets,
      publicacaoStatus:
        current.publicacaoStatus === 'draft' ? 'awaiting_approval' : current.publicacaoStatus,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.publicationRepository.update(updated);

    return ok(updated);
  }
}
