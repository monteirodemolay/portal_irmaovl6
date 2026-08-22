import type { AccessLevel } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ValidationError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';

export interface UpdateArchiveMediaBatchDeps {
  archiveMediaRepository: IArchiveMediaRepository;
  clock: IClock;
}

/**
 * Campos aplicáveis em lote pelo painel de metadados da Central de
 * Publicação (Fase 2, docs/architecture/11-acervo-vl6.md §11.5). Todos
 * opcionais: só os campos informados são sobrescritos em cada
 * `ArchiveMedia` da lista — `undefined` preserva o valor atual.
 */
export interface UpdateArchiveMediaBatchFields {
  autor?: string | null;
  tags?: string[];
  accessLevel?: AccessLevel;
  allowDownload?: boolean;
}

export interface UpdateArchiveMediaBatchInput {
  /** Todas as mídias precisam pertencer a este `ArchiveItem` — mesmo lote de upload. */
  archiveItemId: string;
  archiveMediaIds: string[];
  fields: UpdateArchiveMediaBatchFields;
}

/**
 * Aplica os mesmos campos (fotógrafo/autor, tags, nível de acesso,
 * permitir download) a várias `ArchiveMedia` de uma vez — painel de
 * metadados em lote do passo 2 da Central de Publicação. Mantém simples de
 * propósito: recebe a lista de IDs já resolvida pelo cliente (fila de
 * upload), valida tenant e que todas pertencem ao mesmo `archiveItemId`
 * informado antes de gravar qualquer alteração.
 */
export class UpdateArchiveMediaBatchUseCase {
  constructor(private readonly deps: UpdateArchiveMediaBatchDeps) {}

  async execute(
    ctx: AuthContext,
    input: UpdateArchiveMediaBatchInput,
  ): Promise<Result<ArchiveMedia[]>> {
    requirePermission(ctx, 'archiveMedia:update');

    if (input.archiveMediaIds.length === 0) {
      return err(new ValidationError('Selecione ao menos uma mídia para atualizar.'));
    }

    const found = await Promise.all(
      input.archiveMediaIds.map((id) => this.deps.archiveMediaRepository.findById(id)),
    );

    const medias: ArchiveMedia[] = [];
    for (let i = 0; i < input.archiveMediaIds.length; i += 1) {
      const id = input.archiveMediaIds[i]!;
      const media = found[i];
      if (
        !media ||
        media.tenantId !== ctx.tenantId ||
        media.archiveItemId !== input.archiveItemId
      ) {
        return err(new NotFoundError('ArchiveMedia', id));
      }
      medias.push(media);
    }

    const now = this.deps.clock.now();
    const updated = medias.map((media) => ({
      ...media,
      ...(input.fields.autor !== undefined ? { autor: input.fields.autor } : {}),
      ...(input.fields.tags !== undefined ? { tags: input.fields.tags } : {}),
      ...(input.fields.accessLevel !== undefined ? { accessLevel: input.fields.accessLevel } : {}),
      ...(input.fields.allowDownload !== undefined
        ? { allowDownload: input.fields.allowDownload }
        : {}),
      updatedAt: now,
      updatedBy: ctx.uid,
    }));

    await Promise.all(updated.map((media) => this.deps.archiveMediaRepository.update(media)));

    return ok(updated);
  }
}
