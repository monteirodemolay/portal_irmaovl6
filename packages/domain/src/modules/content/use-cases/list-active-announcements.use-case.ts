import type { Announcement } from '../entities/announcement.entity';
import type { IAnnouncementRepository } from '../repositories/announcement.repository';

export interface ListActiveAnnouncementsDeps {
  announcementRepository: IAnnouncementRepository;
}

/** Avisos publicados e não expirados — sem `AuthContext`, é conteúdo interno mas de leitura ampla. */
export class ListActiveAnnouncementsUseCase {
  constructor(private readonly deps: ListActiveAnnouncementsDeps) {}

  async execute(tenantId: string): Promise<Announcement[]> {
    const active = await this.deps.announcementRepository.listActive(tenantId);
    return active.sort((a, b) => Number(b.destacar) - Number(a.destacar));
  }
}
