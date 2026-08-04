import type { IClock } from '../../../shared/ports';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  err,
  ok,
  type Result,
} from '../../../shared/result';
import type { User } from '../entities/user.entity';
import type { IUserRepository } from '../repositories/user.repository';

export interface AuthenticateUserInput {
  uid: string;
  tenantId: string;
}

export interface AuthenticateUserDeps {
  userRepository: IUserRepository;
  clock: IClock;
}

/**
 * Pós-processamento de um login já validado pelo Firebase Authentication
 * (a verificação de credencial em si é responsabilidade do provedor de
 * identidade, fora do domínio — ver docs/architecture/07 §7.2). Este caso de
 * uso resolve a conta `User` correspondente, garante que pertence ao tenant
 * do host acessado e que está ativa, e registra o último login.
 */
export class AuthenticateUserUseCase {
  constructor(private readonly deps: AuthenticateUserDeps) {}

  async execute(input: AuthenticateUserInput): Promise<Result<User>> {
    const user = await this.deps.userRepository.findById(input.uid);
    if (!user) {
      return err(new NotFoundError('User', input.uid));
    }
    if (user.tenantId !== input.tenantId) {
      return err(new ForbiddenError('tenant:read'));
    }
    if (user.statusConta === 'blocked') {
      return err(new ConflictError('Esta conta está bloqueada. Contate a administração da Loja.'));
    }
    if (user.statusConta === 'pending') {
      return err(new ConflictError('Esta conta ainda não foi ativada.'));
    }

    const updated: User = {
      ...user,
      ultimoLogin: this.deps.clock.now(),
      updatedAt: this.deps.clock.now(),
    };
    await this.deps.userRepository.update(updated);

    return ok(updated);
  }
}
