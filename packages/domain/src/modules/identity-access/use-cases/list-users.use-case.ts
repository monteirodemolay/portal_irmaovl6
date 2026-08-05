import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { User } from '../entities/user.entity';
import type { IUserRepository } from '../repositories/user.repository';

export interface ListUsersDeps {
  userRepository: IUserRepository;
}

export class ListUsersUseCase {
  constructor(private readonly deps: ListUsersDeps) {}

  async execute(ctx: AuthContext): Promise<User[]> {
    requirePermission(ctx, 'user:read');
    return this.deps.userRepository.listByTenant(ctx.tenantId);
  }
}
