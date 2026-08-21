import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { Announcement } from '../entities/announcement.entity';
import type { IAnnouncementRepository } from '../repositories/announcement.repository';

export interface ListConcludedAnnouncementsDeps {
  announcementRepository: IAnnouncementRepository;
  clock: IClock;
}

/** Vencidos ou excluídos — fora da aba principal, mantidos só como registro. */
export class ListConcludedAnnouncementsUseCase {
  constructor(private readonly deps: ListConcludedAnnouncementsDeps) {}

  async execute(ctx: AuthContext, page: PageRequest): Promise<PageResult<Announcement>> {
    requirePermission(ctx, 'announcement:read');
    return this.deps.announcementRepository.listConcluded(
      ctx.tenantId,
      page,
      this.deps.clock.now(),
    );
  }
}
