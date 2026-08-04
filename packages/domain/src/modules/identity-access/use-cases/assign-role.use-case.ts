import type { AssignRoleInput } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ConflictError, err, ok, type Result } from '../../../shared/result';
import type { User } from '../entities/user.entity';
import type { IRoleRepository } from '../repositories/role.repository';
import type { IUserRepository } from '../repositories/user.repository';

export interface AssignRoleDeps {
  userRepository: IUserRepository;
  roleRepository: IRoleRepository;
  clock: IClock;
}

/**
 * Atribui um papel a um usuário. Requer `user:manage`. A mudança de papel
 * dispara, na infraestrutura, o recálculo dos Custom Claims — este caso de
 * uso apenas persiste a nova associação (docs/architecture/06 §6.6 e 07 §7.3).
 */
export class AssignRoleUseCase {
  constructor(private readonly deps: AssignRoleDeps) {}

  async execute(ctx: AuthContext, input: AssignRoleInput): Promise<Result<User>> {
    requirePermission(ctx, 'user:manage');

    const [user, role] = await Promise.all([
      this.deps.userRepository.findById(input.userId),
      this.deps.roleRepository.findById(input.roleId),
    ]);

    if (!user) return err(new NotFoundError('User', input.userId));
    if (!role) return err(new NotFoundError('Role', input.roleId));
    if (user.tenantId !== ctx.tenantId || role.tenantId !== ctx.tenantId) {
      return err(new ConflictError('Usuário e papel devem pertencer à mesma Loja.'));
    }

    const updated: User = {
      ...user,
      roleId: role.id,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.userRepository.update(updated);

    return ok(updated);
  }
}
