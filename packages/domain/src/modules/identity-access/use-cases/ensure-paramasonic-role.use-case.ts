import { DEFAULT_ROLE_PERMISSIONS } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { Role } from '../entities/role.entity';
import type { IRoleRepository } from '../repositories/role.repository';

export interface EnsureParamasonicRoleDeps {
  roleRepository: IRoleRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/** Cria ou sincroniza o papel restrito usado por convidados paramaçônicos. */
export class EnsureParamasonicRoleUseCase {
  constructor(private readonly deps: EnsureParamasonicRoleDeps) {}

  async execute(ctx: AuthContext): Promise<Result<Role>> {
    requirePermission(ctx, 'role:manage');
    const now = this.deps.clock.now();
    const existing = await this.deps.roleRepository.findByKey(ctx.tenantId, 'paramaconica');

    if (existing) {
      const updated: Role = {
        ...existing,
        nome: 'Paramaçônica',
        permissoes: DEFAULT_ROLE_PERMISSIONS.paramaconica,
        sistemico: true,
        updatedAt: now,
        updatedBy: ctx.uid,
      };
      await this.deps.roleRepository.update(updated);
      return ok(updated);
    }

    const role: Role = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      nome: 'Paramaçônica',
      chave: 'paramaconica',
      permissoes: DEFAULT_ROLE_PERMISSIONS.paramaconica,
      sistemico: true,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.roleRepository.create(role);
    return ok(role);
  }
}
