import type { Announcement } from '../entities/announcement.entity';

export interface IAnnouncementRepository {
  findById(id: string): Promise<Announcement | null>;
  listActive(tenantId: string, at?: Date): Promise<Announcement[]>;
  listHighlighted(tenantId: string): Promise<Announcement[]>;
  listAll(tenantId: string): Promise<Announcement[]>;
  create(announcement: Announcement): Promise<void>;
  update(announcement: Announcement): Promise<void>;
}
