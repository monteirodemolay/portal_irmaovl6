import type { Link } from '../entities/link.entity';

export interface ILinkRepository {
  findById(id: string): Promise<Link | null>;
  listActive(tenantId: string): Promise<Link[]>;
  listAll(tenantId: string): Promise<Link[]>;
  create(link: Link): Promise<void>;
  update(link: Link): Promise<void>;
}
