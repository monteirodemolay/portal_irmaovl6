import type { AnnouncementFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Announcement } from '../entities/announcement.entity';
import type { IAnnouncementRepository } from '../repositories/announcement.repository';

export interface UpdateAnnouncementDeps {
  announcementRepository: IAnnouncementRepository;
  clock: IClock;
}

export class UpdateAnnouncementUseCase {
  constructor(private readonly deps: UpdateAnnouncementDeps) {}

  async execute(
    ctx: AuthContext,
    announcementId: string,
    input: AnnouncementFormValues,
  ): Promise<Result<Announcement>> {
    requirePermission(ctx, 'announcement:update');

    const current = await this.deps.announcementRepository.findById(announcementId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Announcement', announcementId));
    }

    const updated: Announcement = {
      ...current,
      ...input,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.announcementRepository.update(updated);

    return ok(updated);
  }
}
