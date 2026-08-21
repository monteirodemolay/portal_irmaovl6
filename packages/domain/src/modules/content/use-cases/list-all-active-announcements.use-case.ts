import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import type { Announcement } from '../entities/announcement.entity';
import type { IAnnouncementRepository } from '../repositories/announcement.repository';

export interface ListAllActiveAnnouncementsDeps {
  announcementRepository: IAnnouncementRepository;
  clock: IClock;
}

/** Aba principal do admin — publicados ou rascunho, mas nunca vencidos/excluídos. */
export class ListAllActiveAnnouncementsUseCase {
  constructor(private readonly deps: ListAllActiveAnnouncementsDeps) {}

  async execute(ctx: AuthContext): Promise<Announcement[]> {
    requirePermission(ctx, 'announcement:read');
    return this.deps.announcementRepository.listAllActive(ctx.tenantId, this.deps.clock.now());
  }
}
