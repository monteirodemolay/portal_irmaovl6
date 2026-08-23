import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { PublishArchiveItemUseCase } from './publish-archive-item.use-case';

export interface PublishScheduledArchiveItemsDeps {
  archiveItemRepository: IArchiveItemRepository;
  publishArchiveItem: PublishArchiveItemUseCase;
  clock: IClock;
}

export interface PublishScheduledArchiveItemsOutput {
  publicados: string[];
  falhas: { archiveItemId: string; error: string }[];
}

/**
 * Publica automaticamente todo `ArchiveItem` cujo agendamento
 * (`ScheduleArchiveItemPublicationUseCase`) já venceu — Fase B "Publicação
 * avançada". Disparado por tenant a partir da rota de Cron
 * `/api/cron/publish-scheduled-archive-items` (Vercel Cron varre todos os
 * tenants e chama `execute` uma vez por tenant, mesmo padrão de
 * `/api/cron/birthday-reminder`).
 *
 * Reaproveita `PublishArchiveItemUseCase.execute` item a item — nunca
 * duplica a regra de bloqueio/transição de publicação, e cada falha
 * individual (ex.: pendência surgida depois do agendamento) não impede os
 * demais itens do lote de publicarem.
 */
export class PublishScheduledArchiveItemsUseCase {
  constructor(private readonly deps: PublishScheduledArchiveItemsDeps) {}

  async execute(ctx: AuthContext): Promise<Result<PublishScheduledArchiveItemsOutput>> {
    requirePermission(ctx, 'archiveItem:publish');

    const now = this.deps.clock.now();
    const scheduled = await this.deps.archiveItemRepository.findScheduledForPublication(
      ctx.tenantId,
      now,
    );

    const publicados: string[] = [];
    const falhas: { archiveItemId: string; error: string }[] = [];

    for (const item of scheduled) {
      const result = await this.deps.publishArchiveItem.execute(ctx, item.id);
      if (result.ok) {
        publicados.push(item.id);
        await this.deps.archiveItemRepository.update({
          ...result.value,
          publicarEm: null,
        });
      } else {
        falhas.push({ archiveItemId: item.id, error: result.error.message });
      }
    }

    return ok({ publicados, falhas });
  }
}
