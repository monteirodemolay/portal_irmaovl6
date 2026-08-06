import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  err,
  ok,
  type Result,
} from '../../../shared/result';
import type { User, UserAccountStatus } from '../entities/user.entity';
import type { IUserRepository } from '../repositories/user.repository';

export interface SetUserStatusInput {
  userId: string;
  statusConta: UserAccountStatus;
}

export interface SetUserStatusDeps {
  userRepository: IUserRepository;
  clock: IClock;
}

/**
 * Bloqueia/reativa a conta de um usuário — requer `user:manage`. Bloquear
 * não afeta o Firebase Auth diretamente (isso é feito pela Server Action,
 * que também desabilita a conta no Admin SDK); este caso de uso só cobre
 * `User.statusConta`, a fonte de verdade que `AuthenticateUserUseCase`
 * consulta em cada login.
 */
export class SetUserStatusUseCase {
  constructor(private readonly deps: SetUserStatusDeps) {}

  async execute(ctx: AuthContext, input: SetUserStatusInput): Promise<Result<User>> {
    requirePermission(ctx, 'user:manage');

    const user = await this.deps.userRepository.findById(input.userId);
    if (!user) {
      return err(new NotFoundError('User', input.userId));
    }
    if (user.tenantId !== ctx.tenantId) {
      return err(new ConflictError('Usuário deve pertencer à mesma Loja.'));
    }
    if (user.id === ctx.uid && input.statusConta === 'blocked') {
      return err(new ValidationError('Você não pode bloquear a própria conta.'));
    }

    const updated: User = {
      ...user,
      statusConta: input.statusConta,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.userRepository.update(updated);

    return ok(updated);
  }
}
