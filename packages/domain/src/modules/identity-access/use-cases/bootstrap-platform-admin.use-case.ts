import { DEFAULT_ROLE_PERMISSIONS, PLATFORM_TENANT_ID } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { Role } from '../entities/role.entity';
import type { User } from '../entities/user.entity';
import type { IRoleRepository } from '../repositories/role.repository';
import type { IUserRepository } from '../repositories/user.repository';

export interface BootstrapPlatformAdminInput {
  uid: string;
  email: string;
}

export interface BootstrapPlatformAdminDeps {
  userRepository: IUserRepository;
  roleRepository: IRoleRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cria (de forma idempotente) o papel `super_admin` sob `PLATFORM_TENANT_ID`
 * — ele não nasce do seed de fábrica de nenhuma Loja (docs/architecture/08
 * §8.3) — e a primeira conta `User` com esse papel. Análogo a
 * `BootstrapTenantAdminUseCase`, mas para o Administrador Geral da
 * plataforma. Só roda via script operacional (nunca exposto como rota),
 * com o mesmo contexto sintético usado no bootstrap de tenant.
 */
export class BootstrapPlatformAdminUseCase {
  constructor(private readonly deps: BootstrapPlatformAdminDeps) {}

  async execute(ctx: AuthContext, input: BootstrapPlatformAdminInput): Promise<Result<User>> {
    requirePermission(ctx, 'tenant:create');

    const now = this.deps.clock.now();

    let role = await this.deps.roleRepository.findByKey(PLATFORM_TENANT_ID, 'super_admin');
    if (!role) {
      role = {
        id: this.deps.idGenerator.next(),
        tenantId: PLATFORM_TENANT_ID,
        nome: 'super_admin',
        chave: 'super_admin',
        permissoes: DEFAULT_ROLE_PERMISSIONS.super_admin,
        sistemico: true,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.uid,
        updatedBy: ctx.uid,
        deletedAt: null,
        status: 'active',
        ativo: true,
      } satisfies Role;
      await this.deps.roleRepository.create(role);
    }

    const user: User = {
      id: input.uid,
      tenantId: PLATFORM_TENANT_ID,
      email: input.email,
      memberId: null,
      roleId: role.id,
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
