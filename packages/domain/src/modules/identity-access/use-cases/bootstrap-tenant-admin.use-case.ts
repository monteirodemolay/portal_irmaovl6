import type { AuthContext } from '../../../shared/auth-context';
import { requirePlatformAdmin } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { User } from '../entities/user.entity';
import type { IRoleRepository } from '../repositories/role.repository';
import type { IUserRepository } from '../repositories/user.repository';

export interface BootstrapTenantAdminInput {
  uid: string;
  tenantId: string;
  email: string;
}

export interface BootstrapTenantAdminDeps {
  userRepository: IUserRepository;
  roleRepository: IRoleRepository;
  clock: IClock;
}

/**
 * Cria a primeira conta `User` (papel `admin`) de um tenant recém-criado.
 * Existe para resolver o problema do "primeiro usuário": ninguém no tenant
 * novo tem `user:manage` ainda para convidar alguém. Só o Administrador
 * Geral pode chamar (`requirePlatformAdmin` — `input.tenantId` é escolhido
 * pelo chamador, então `tenant:manage` de um Administrador de Loja não
 * poderia bastar aqui: deixaria qualquer Loja criar um admin em outra),
 * nunca exposto como auto-cadastro público.
 */
export class BootstrapTenantAdminUseCase {
  constructor(private readonly deps: BootstrapTenantAdminDeps) {}

  async execute(ctx: AuthContext, input: BootstrapTenantAdminInput): Promise<Result<User>> {
    requirePlatformAdmin(ctx);

    const adminRole = await this.deps.roleRepository.findByKey(input.tenantId, 'admin');
    if (!adminRole) {
      return err(new NotFoundError('Role(admin)', input.tenantId));
    }

    const now = this.deps.clock.now();
    const user: User = {
      id: input.uid,
      tenantId: input.tenantId,
      email: input.email,
      memberId: null,
      roleId: adminRole.id,
      mfaHabilitado: false,
      ultimoLogin: null,
      statusConta: 'active',
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.userRepository.create(user);

    return ok(user);
  }
}
