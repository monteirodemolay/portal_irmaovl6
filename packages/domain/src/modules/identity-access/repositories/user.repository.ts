import type { User } from '../entities/user.entity';

export interface IUserRepository {
  findById(uid: string): Promise<User | null>;
  findByEmail(tenantId: string, email: string): Promise<User | null>;
  listByTenant(tenantId: string): Promise<User[]>;
  create(user: User): Promise<void>;
  update(user: User): Promise<void>;
}
