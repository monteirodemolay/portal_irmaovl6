import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { Announcement } from '../entities/announcement.entity';
import type { IAnnouncementRepository } from '../repositories/announcement.repository';

export interface ListAllAnnouncementsDeps {
  announcementRepository: IAnnouncementRepository;
}

/** Listagem administrativa (inclui rascunhos e expirados) — requer `announcement:read`. */
export class ListAllAnnouncementsUseCase {
  constructor(private readonly deps: ListAllAnnouncementsDeps) {}

  async execute(ctx: AuthContext): Promise<Announcement[]> {
    requirePermission(ctx, 'announcement:read');
    return this.deps.announcementRepository.listAll(ctx.tenantId);
  }
}
