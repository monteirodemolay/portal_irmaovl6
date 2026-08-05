import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Announcement } from '../entities/announcement.entity';
import type { IAnnouncementRepository } from '../repositories/announcement.repository';

export interface PublishAnnouncementDeps {
  announcementRepository: IAnnouncementRepository;
  clock: IClock;
}

export class PublishAnnouncementUseCase {
  constructor(private readonly deps: PublishAnnouncementDeps) {}

  async execute(
    ctx: AuthContext,
    announcementId: string,
    publicar: boolean,
  ): Promise<Result<Announcement>> {
    requirePermission(ctx, 'announcement:publish');

    const current = await this.deps.announcementRepository.findById(announcementId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Announcement', announcementId));
    }

    const now = this.deps.clock.now();
    const updated: Announcement = {
      ...current,
      publicado: publicar,
      dataPublicacao: publicar ? (current.dataPublicacao ?? now) : current.dataPublicacao,
      status: publicar ? 'active' : 'draft',
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.announcementRepository.update(updated);

    return ok(updated);
  }
}
