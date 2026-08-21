import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IAnnouncementRepository } from '../repositories/announcement.repository';

export interface HardDeleteAnnouncementDeps {
  announcementRepository: IAnnouncementRepository;
}

/** Exclusão física, irreversível — usada pra apagar registros de vez (ex.: cadastro por engano). */
export class HardDeleteAnnouncementUseCase {
  constructor(private readonly deps: HardDeleteAnnouncementDeps) {}

  async execute(ctx: AuthContext, announcementId: string): Promise<Result<void>> {
    requirePermission(ctx, 'announcement:delete');

    const current = await this.deps.announcementRepository.findById(announcementId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Announcement', announcementId));
    }

    await this.deps.announcementRepository.hardDelete(announcementId);
    return ok(undefined);
  }
}
