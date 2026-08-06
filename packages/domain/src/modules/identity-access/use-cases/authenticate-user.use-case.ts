import { PLATFORM_TENANT_ID } from '@vl6/shared';
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
  /**
   * Tenant resolvido pelo host da requisição, ou `null` quando o host não
   * resolve a nenhuma Loja específica (login unificado — docs/architecture
   * /07 §7.1: domínio compartilhado, ex. o domínio padrão da Vercel, serve
   * de "portão" pra qualquer Loja). Com `null`, confia direto no
   * `User.tenantId` já persistido em vez de exigir bater com o host —
   * `tenantId` nunca vem de input de cliente de qualquer forma, só do
   * documento do próprio usuário.
   */
  tenantId: string | null;
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
 * do host acessado (quando o host resolveu algum) e que está ativa, e
 * registra o último login. Duas exceções à checagem de tenant: o
 * Administrador Geral (`tenantId === PLATFORM_TENANT_ID`, docs/architecture
 * /08 §8.3), que não pertence a nenhum host de Loja; e login unificado
 * (`input.tenantId === null`), onde não há host de Loja específico pra
 * comparar — confia no tenant do próprio usuário.
 */
export class AuthenticateUserUseCase {
  constructor(private readonly deps: AuthenticateUserDeps) {}

  async execute(input: AuthenticateUserInput): Promise<Result<User>> {
    const user = await this.deps.userRepository.findById(input.uid);
    if (!user) {
      return err(new NotFoundError('User', input.uid));
    }
    if (
      input.tenantId !== null &&
      user.tenantId !== input.tenantId &&
      user.tenantId !== PLATFORM_TENANT_ID
    ) {
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
