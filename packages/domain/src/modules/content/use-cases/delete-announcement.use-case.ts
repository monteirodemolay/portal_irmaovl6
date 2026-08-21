import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Announcement } from '../entities/announcement.entity';
import type { IAnnouncementRepository } from '../repositories/announcement.repository';

export interface DeleteAnnouncementDeps {
  announcementRepository: IAnnouncementRepository;
  clock: IClock;
}

/** Exclusão lógica — seta `deletedAt`, nunca remove o documento (docs/architecture/03 §3.1). */
export class DeleteAnnouncementUseCase {
  constructor(private readonly deps: DeleteAnnouncementDeps) {}

  async execute(ctx: AuthContext, announcementId: string): Promise<Result<Announcement>> {
    requirePermission(ctx, 'announcement:delete');

    const current = await this.deps.announcementRepository.findById(announcementId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Announcement', announcementId));
    }

    const now = this.deps.clock.now();
    const updated: Announcement = {
      ...current,
      deletedAt: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.announcementRepository.update(updated);

    return ok(updated);
  }
}
