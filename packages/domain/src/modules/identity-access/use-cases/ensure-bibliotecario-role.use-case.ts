import { DEFAULT_ROLE_PERMISSIONS } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { Role } from '../entities/role.entity';
import type { IRoleRepository } from '../repositories/role.repository';

export interface EnsureBibliotecarioRoleDeps {
  roleRepository: IRoleRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/** Cria ou sincroniza o papel restrito só ao módulo Biblioteca (balcão, catálogo, etiquetas). */
export class EnsureBibliotecarioRoleUseCase {
  constructor(private readonly deps: EnsureBibliotecarioRoleDeps) {}

  async execute(ctx: AuthContext): Promise<Result<Role>> {
    requirePermission(ctx, 'role:manage');
    const now = this.deps.clock.now();
    const existing = await this.deps.roleRepository.findByKey(ctx.tenantId, 'bibliotecario');

    if (existing) {
      const updated: Role = {
        ...existing,
        nome: 'Bibliotecário',
        permissoes: DEFAULT_ROLE_PERMISSIONS.bibliotecario,
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
      nome: 'Bibliotecário',
      chave: 'bibliotecario',
      permissoes: DEFAULT_ROLE_PERMISSIONS.bibliotecario,
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
